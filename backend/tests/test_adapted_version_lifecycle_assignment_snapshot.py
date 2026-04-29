import unittest
import uuid
from collections.abc import Iterator

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.dependencies import get_db
from app.main import app
from app.models.learning_material import LearningMaterial
from app.models.notification import Notification
from app.models.student_learning_material import StudentLearningMaterial
from app.models.teacher_student import TeacherStudent
from app.models.user import User
from app.schemas.learning_materials import TeacherLearningMaterialCreateRequest
from app.services.auth_service import get_password_hash
from app.services.learning_materials_service import (
    get_teacher_learning_material_compare_ready_detail,
    save_or_update_adapted_learning_material,
)


class AdaptedVersionLifecycleAssignmentSnapshotTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        cls.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=cls.engine)
        User.__table__.create(bind=cls.engine, checkfirst=True)
        LearningMaterial.__table__.create(bind=cls.engine, checkfirst=True)
        TeacherStudent.__table__.create(bind=cls.engine, checkfirst=True)
        StudentLearningMaterial.__table__.create(bind=cls.engine, checkfirst=True)
        Notification.__table__.create(bind=cls.engine, checkfirst=True)

        cls.original_startup = list(app.router.on_startup)
        app.router.on_startup = []

        def override_get_db() -> Iterator[Session]:
            db = cls.SessionLocal()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls) -> None:
        app.dependency_overrides.clear()
        app.router.on_startup = cls.original_startup
        cls.client.close()
        cls.engine.dispose()

    def setUp(self) -> None:
        with self.SessionLocal() as db:
            db.query(Notification).delete()
            db.query(StudentLearningMaterial).delete()
            db.query(TeacherStudent).delete()
            db.query(LearningMaterial).delete()
            db.query(User).delete()
            db.commit()

            self.teacher_id = uuid.uuid4()
            self.student_id = uuid.uuid4()
            self.source_material_id = uuid.uuid4()

            db.add_all(
                [
                    User(
                        id=self.teacher_id,
                        email="teacher.lifecycle@example.com",
                        password_hash=get_password_hash("TeacherLifecycle123!"),
                        role="teacher",
                        is_active=True,
                    ),
                    User(
                        id=self.student_id,
                        email="student.lifecycle@example.com",
                        password_hash=get_password_hash("StudentLifecycle123!"),
                        role="student",
                        is_active=True,
                    ),
                ]
            )
            db.add(
                TeacherStudent(
                    id=uuid.uuid4(),
                    teacher_user_id=self.teacher_id,
                    student_user_id=self.student_id,
                )
            )
            db.add(
                LearningMaterial(
                    id=self.source_material_id,
                    teacher_user_id=self.teacher_id,
                    title="Источник для snapshot audit",
                    original_text="Исходный текст для проверки lifecycle и snapshot.",
                    adapted_text=None,
                    source_type=None,
                    source_material_id=None,
                    source_filename=None,
                    adaptation_mode=None,
                )
            )
            db.commit()

    def _login(self, email: str, password: str) -> str:
        response = self.client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": password},
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()["access_token"]

    def _save_adapted_material(
        self,
        db: Session,
        *,
        title: str,
        adapted_text: str,
        adaptation_mode: str,
    ):
        return save_or_update_adapted_learning_material(
            db,
            teacher_user_id=self.teacher_id,
            payload=TeacherLearningMaterialCreateRequest(
                title=title,
                original_text="Исходный текст для проверки lifecycle и snapshot.",
                adapted_text=adapted_text,
                source_type="material",
                source_material_id=self.source_material_id,
                adaptation_mode=adaptation_mode,
            ),
        )

    def test_same_source_different_mode_creates_second_version_and_same_mode_updates_existing_one(self) -> None:
        with self.SessionLocal() as db:
            basic_response, basic_save_type = self._save_adapted_material(
                db,
                title="Первая версия",
                adapted_text="Базовая адаптация для первого сохранения.",
                adaptation_mode="basic_simplify",
            )
            structured_response, structured_save_type = self._save_adapted_material(
                db,
                title="Вторая версия",
                adapted_text="Структурированная адаптация для второго режима.",
                adaptation_mode="structured_explanation",
            )

            self.assertEqual(basic_save_type, "created")
            self.assertEqual(structured_save_type, "created")
            self.assertNotEqual(basic_response.id, structured_response.id)

            detail = get_teacher_learning_material_compare_ready_detail(
                db,
                teacher_user_id=self.teacher_id,
                material_id=basic_response.id,
            )
            self.assertIsNotNone(detail)
            self.assertEqual(len(detail.available_adaptation_versions), 2)
            self.assertEqual(
                {str(version.id) for version in detail.available_adaptation_versions},
                {str(basic_response.id), str(structured_response.id)},
            )

            updated_response, updated_save_type = self._save_adapted_material(
                db,
                title="Обновлённая базовая версия",
                adapted_text="Обновлённый текст для режима basic_simplify.",
                adaptation_mode="basic_simplify",
            )

            self.assertEqual(updated_save_type, "updated")
            self.assertEqual(updated_response.id, basic_response.id)

            grouped_materials = (
                db.query(LearningMaterial)
                .filter(
                    LearningMaterial.teacher_user_id == self.teacher_id,
                    LearningMaterial.source_material_id == self.source_material_id,
                    LearningMaterial.adapted_text.is_not(None),
                )
                .all()
            )
            self.assertEqual(len(grouped_materials), 2)

            reloaded_basic = (
                db.query(LearningMaterial)
                .filter(LearningMaterial.id == basic_response.id)
                .first()
            )
            self.assertIsNotNone(reloaded_basic)
            self.assertEqual(
                reloaded_basic.adapted_text,
                "Обновлённый текст для режима basic_simplify.",
            )

    def test_assignment_stores_snapshot_and_student_keeps_old_text_after_live_version_update(self) -> None:
        with self.SessionLocal() as db:
            basic_response, _ = self._save_adapted_material(
                db,
                title="Группа адаптаций",
                adapted_text="Базовая версия для назначения ученику.",
                adaptation_mode="basic_simplify",
            )
            structured_response, _ = self._save_adapted_material(
                db,
                title="Группа адаптаций",
                adapted_text="Структурированная версия для назначения ученику.",
                adaptation_mode="structured_explanation",
            )

            self.assertNotEqual(basic_response.id, structured_response.id)

        teacher_token = self._login("teacher.lifecycle@example.com", "TeacherLifecycle123!")
        assign_response = self.client.post(
            f"/api/v1/teacher/materials/{structured_response.id}/assign",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={"student_user_id": str(self.student_id)},
        )
        self.assertEqual(assign_response.status_code, 200, assign_response.text)

        with self.SessionLocal() as db:
            assignment = (
                db.query(StudentLearningMaterial)
                .filter(
                    StudentLearningMaterial.student_user_id == self.student_id,
                    StudentLearningMaterial.learning_material_id == structured_response.id,
                )
                .first()
            )
            self.assertIsNotNone(assignment)
            self.assertEqual(assignment.assigned_title, "Группа адаптаций")
            self.assertEqual(
                assignment.assigned_text,
                "Структурированная версия для назначения ученику.",
            )
            self.assertEqual(assignment.assigned_adaptation_mode, "structured_explanation")
            self.assertTrue(assignment.assigned_is_adapted)

            self._save_adapted_material(
                db,
                title="Группа адаптаций",
                adapted_text="Новая live-версия, которую уже назначенный ученик видеть не должен.",
                adaptation_mode="structured_explanation",
            )

        student_token = self._login("student.lifecycle@example.com", "StudentLifecycle123!")

        list_response = self.client.get(
            "/api/v1/student/materials",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        self.assertEqual(list_response.status_code, 200, list_response.text)
        list_payload = list_response.json()["items"]
        self.assertEqual(len(list_payload), 1)
        self.assertEqual(list_payload[0]["title"], "Группа адаптаций")
        self.assertEqual(
            list_payload[0]["preview_text"],
            "Структурированная версия для назначения ученику.",
        )
        self.assertTrue(list_payload[0]["is_adapted"])

        detail_response = self.client.get(
            f"/api/v1/student/materials/{structured_response.id}",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        self.assertEqual(detail_response.status_code, 200, detail_response.text)
        detail_payload = detail_response.json()
        self.assertEqual(detail_payload["title"], "Группа адаптаций")
        self.assertEqual(
            detail_payload["original_text"],
            "Структурированная версия для назначения ученику.",
        )
        self.assertTrue(detail_payload["is_adapted"])
        self.assertNotIn("Новая live-версия", detail_payload["original_text"])


if __name__ == "__main__":
    unittest.main()
