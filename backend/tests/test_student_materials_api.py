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
from app.models.student_learning_material import StudentLearningMaterial
from app.models.user import User
from app.services.auth_service import get_password_hash


class StudentMaterialsApiTests(unittest.TestCase):
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
        StudentLearningMaterial.__table__.create(bind=cls.engine, checkfirst=True)

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
            db.query(StudentLearningMaterial).delete()
            db.query(LearningMaterial).delete()
            db.query(User).delete()
            db.commit()

            self.student_id = uuid.uuid4()
            self.other_student_id = uuid.uuid4()
            self.teacher_id = uuid.uuid4()
            self.admin_id = uuid.uuid4()

            db.add_all(
                [
                    User(
                        id=self.student_id,
                        email="student.audit@example.com",
                        password_hash=get_password_hash("StudentAudit123!"),
                        role="student",
                        is_active=True,
                    ),
                    User(
                        id=self.other_student_id,
                        email="student.other@example.com",
                        password_hash=get_password_hash("StudentOther123!"),
                        role="student",
                        is_active=True,
                    ),
                    User(
                        id=self.teacher_id,
                        email="teacher.audit@example.com",
                        password_hash=get_password_hash("TeacherAudit123!"),
                        role="teacher",
                        is_active=True,
                    ),
                    User(
                        id=self.admin_id,
                        email="admin.audit@example.com",
                        password_hash=get_password_hash("AdminAudit123!"),
                        role="admin",
                        is_active=True,
                    ),
                ]
            )

            self.assigned_adapted_id = uuid.uuid4()
            self.assigned_legacy_id = uuid.uuid4()
            self.unassigned_adapted_id = uuid.uuid4()
            self.other_version_id = uuid.uuid4()

            db.add_all(
                [
                    LearningMaterial(
                        id=self.assigned_adapted_id,
                        teacher_user_id=self.teacher_id,
                        title="Адаптированный текст",
                        original_text="Исходный текст, который студент не должен видеть как основной.",
                        adapted_text="Короткий и понятный адаптированный текст для ученика.",
                    ),
                    LearningMaterial(
                        id=self.assigned_legacy_id,
                        teacher_user_id=self.teacher_id,
                        title="Legacy draft",
                        original_text="Обычный исходный текст без адаптации для fallback-показа.",
                        adapted_text=None,
                    ),
                    LearningMaterial(
                        id=self.unassigned_adapted_id,
                        teacher_user_id=self.teacher_id,
                        title="Чужой материал",
                        original_text="Этот текст не должен попасть текущему студенту.",
                        adapted_text="Чужая адаптированная версия.",
                    ),
                    LearningMaterial(
                        id=self.other_version_id,
                        teacher_user_id=self.teacher_id,
                        title="Другая версия",
                        original_text="Другой исходный текст.",
                        adapted_text="Другая адаптированная версия, которую не назначали.",
                    ),
                ]
            )

            db.add_all(
                [
                    StudentLearningMaterial(
                        id=uuid.uuid4(),
                        student_user_id=self.student_id,
                        learning_material_id=self.assigned_adapted_id,
                        assigned_by_teacher_user_id=self.teacher_id,
                    ),
                    StudentLearningMaterial(
                        id=uuid.uuid4(),
                        student_user_id=self.student_id,
                        learning_material_id=self.assigned_legacy_id,
                        assigned_by_teacher_user_id=self.teacher_id,
                    ),
                    StudentLearningMaterial(
                        id=uuid.uuid4(),
                        student_user_id=self.other_student_id,
                        learning_material_id=self.unassigned_adapted_id,
                        assigned_by_teacher_user_id=self.teacher_id,
                    ),
                ]
            )
            db.commit()

    def _login(self, email: str, password: str) -> str:
        response = self.client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": password},
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()["access_token"]

    def test_student_list_shows_assigned_materials_with_adapted_preview_and_legacy_fallback(self) -> None:
        token = self._login("student.audit@example.com", "StudentAudit123!")
        response = self.client.get(
            "/api/v1/student/materials",
            headers={"Authorization": f"Bearer {token}"},
        )

        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()["items"]

        self.assertEqual(len(payload), 2)
        materials_by_id = {item["id"]: item for item in payload}

        self.assertIn(str(self.assigned_adapted_id), materials_by_id)
        self.assertIn(str(self.assigned_legacy_id), materials_by_id)
        self.assertNotIn(str(self.unassigned_adapted_id), materials_by_id)
        self.assertNotIn(str(self.other_version_id), materials_by_id)

        adapted_item = materials_by_id[str(self.assigned_adapted_id)]
        self.assertTrue(adapted_item["is_adapted"])
        self.assertEqual(
            adapted_item["preview_text"],
            "Короткий и понятный адаптированный текст для ученика.",
        )

        legacy_item = materials_by_id[str(self.assigned_legacy_id)]
        self.assertFalse(legacy_item["is_adapted"])
        self.assertEqual(
            legacy_item["preview_text"],
            "Обычный исходный текст без адаптации для fallback-показа.",
        )

    def test_student_detail_prefers_assigned_adapted_text_and_keeps_legacy_material_readable(self) -> None:
        token = self._login("student.audit@example.com", "StudentAudit123!")

        adapted_response = self.client.get(
            f"/api/v1/student/materials/{self.assigned_adapted_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(adapted_response.status_code, 200, adapted_response.text)
        adapted_payload = adapted_response.json()
        self.assertTrue(adapted_payload["is_adapted"])
        self.assertEqual(
            adapted_payload["original_text"],
            "Короткий и понятный адаптированный текст для ученика.",
        )

        legacy_response = self.client.get(
            f"/api/v1/student/materials/{self.assigned_legacy_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(legacy_response.status_code, 200, legacy_response.text)
        legacy_payload = legacy_response.json()
        self.assertFalse(legacy_payload["is_adapted"])
        self.assertEqual(
            legacy_payload["original_text"],
            "Обычный исходный текст без адаптации для fallback-показа.",
        )

    def test_student_cannot_open_unassigned_material(self) -> None:
        token = self._login("student.audit@example.com", "StudentAudit123!")
        response = self.client.get(
            f"/api/v1/student/materials/{self.unassigned_adapted_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        self.assertEqual(response.status_code, 404, response.text)
        self.assertEqual(response.json()["detail"], "Learning material not found")

    def test_teacher_and_admin_cannot_use_student_material_endpoints(self) -> None:
        teacher_token = self._login("teacher.audit@example.com", "TeacherAudit123!")
        admin_token = self._login("admin.audit@example.com", "AdminAudit123!")

        teacher_response = self.client.get(
            "/api/v1/student/materials",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )
        admin_response = self.client.get(
            "/api/v1/student/materials",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        self.assertEqual(teacher_response.status_code, 403, teacher_response.text)
        self.assertEqual(teacher_response.json()["detail"], "Student access required")
        self.assertEqual(admin_response.status_code, 403, admin_response.text)
        self.assertEqual(admin_response.json()["detail"], "Student access required")


if __name__ == "__main__":
    unittest.main()
