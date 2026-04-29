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
from app.services.learning_materials_service import save_or_update_adapted_learning_material


class TeacherMaterialSoftDeleteTests(unittest.TestCase):
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
            self.other_teacher_id = uuid.uuid4()
            self.student_id = uuid.uuid4()
            self.admin_id = uuid.uuid4()
            self.source_material_id = uuid.uuid4()
            self.draft_material_id = uuid.uuid4()

            db.add_all(
                [
                    User(
                        id=self.teacher_id,
                        email="teacher.softdelete@example.com",
                        password_hash=get_password_hash("TeacherSoftDelete123!"),
                        role="teacher",
                        is_active=True,
                    ),
                    User(
                        id=self.other_teacher_id,
                        email="teacher.other.softdelete@example.com",
                        password_hash=get_password_hash("TeacherOtherSoftDelete123!"),
                        role="teacher",
                        is_active=True,
                    ),
                    User(
                        id=self.student_id,
                        email="student.softdelete@example.com",
                        password_hash=get_password_hash("StudentSoftDelete123!"),
                        role="student",
                        is_active=True,
                    ),
                    User(
                        id=self.admin_id,
                        email="admin.softdelete@example.com",
                        password_hash=get_password_hash("AdminSoftDelete123!"),
                        role="admin",
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
            db.add_all(
                [
                    LearningMaterial(
                        id=self.source_material_id,
                        teacher_user_id=self.teacher_id,
                        title="Источник для soft delete",
                        original_text="Исходный текст для адаптированного материала.",
                        adapted_text=None,
                    ),
                    LearningMaterial(
                        id=self.draft_material_id,
                        teacher_user_id=self.teacher_id,
                        title="Draft material for soft delete",
                        original_text="Черновой текст для удаления.",
                        adapted_text=None,
                    ),
                ]
            )
            db.commit()

            adapted_response, _ = save_or_update_adapted_learning_material(
                db,
                teacher_user_id=self.teacher_id,
                payload=TeacherLearningMaterialCreateRequest(
                    title="Adapted group for soft delete",
                    original_text="Исходный текст для адаптированного материала.",
                    adapted_text="Адаптированный текст для удаления.",
                    source_type="material",
                    source_material_id=self.source_material_id,
                    adaptation_mode="basic_simplify",
                ),
            )
            self.adapted_material_id = adapted_response.id

    def _login(self, email: str, password: str) -> str:
        response = self.client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": password},
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()["access_token"]

    def test_teacher_can_soft_delete_own_draft_material(self) -> None:
        token = self._login("teacher.softdelete@example.com", "TeacherSoftDelete123!")

        response = self.client.delete(
            f"/api/v1/teacher/materials/{self.draft_material_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json(), {"detail": "Material deleted"})

        with self.SessionLocal() as db:
            material = db.query(LearningMaterial).filter(LearningMaterial.id == self.draft_material_id).first()
            self.assertIsNotNone(material)
            self.assertIsNotNone(material.deleted_at)

    def test_teacher_can_soft_delete_own_adapted_material(self) -> None:
        token = self._login("teacher.softdelete@example.com", "TeacherSoftDelete123!")

        response = self.client.delete(
            f"/api/v1/teacher/materials/{self.adapted_material_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json(), {"detail": "Material deleted"})

        with self.SessionLocal() as db:
            material = db.query(LearningMaterial).filter(LearningMaterial.id == self.adapted_material_id).first()
            self.assertIsNotNone(material)
            self.assertIsNotNone(material.deleted_at)

    def test_deleted_material_disappears_from_teacher_list_and_detail_returns_404(self) -> None:
        token = self._login("teacher.softdelete@example.com", "TeacherSoftDelete123!")

        delete_response = self.client.delete(
            f"/api/v1/teacher/materials/{self.draft_material_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(delete_response.status_code, 200, delete_response.text)

        list_response = self.client.get(
            "/api/v1/teacher/materials?kind=draft",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(list_response.status_code, 200, list_response.text)
        self.assertNotIn(
            str(self.draft_material_id),
            {item["id"] for item in list_response.json()["items"]},
        )

        detail_response = self.client.get(
            f"/api/v1/teacher/materials/{self.draft_material_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(detail_response.status_code, 404, detail_response.text)
        self.assertEqual(detail_response.json()["detail"], "Learning material not found")

    def test_other_teacher_cannot_delete_material(self) -> None:
        token = self._login(
            "teacher.other.softdelete@example.com",
            "TeacherOtherSoftDelete123!",
        )

        response = self.client.delete(
            f"/api/v1/teacher/materials/{self.draft_material_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        self.assertEqual(response.status_code, 404, response.text)
        self.assertEqual(response.json()["detail"], "Learning material not found")

    def test_student_and_admin_cannot_delete_teacher_material(self) -> None:
        student_token = self._login("student.softdelete@example.com", "StudentSoftDelete123!")
        admin_token = self._login("admin.softdelete@example.com", "AdminSoftDelete123!")

        student_response = self.client.delete(
            f"/api/v1/teacher/materials/{self.draft_material_id}",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        self.assertEqual(student_response.status_code, 403, student_response.text)
        self.assertEqual(student_response.json()["detail"], "Teacher access required")

        admin_response = self.client.delete(
            f"/api/v1/teacher/materials/{self.draft_material_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        self.assertEqual(admin_response.status_code, 403, admin_response.text)
        self.assertEqual(admin_response.json()["detail"], "Teacher access required")

    def test_student_assignment_snapshot_remains_readable_after_material_delete(self) -> None:
        teacher_token = self._login("teacher.softdelete@example.com", "TeacherSoftDelete123!")
        student_token = self._login("student.softdelete@example.com", "StudentSoftDelete123!")

        assign_response = self.client.post(
            f"/api/v1/teacher/materials/{self.adapted_material_id}/assign",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={"student_user_id": str(self.student_id)},
        )
        self.assertEqual(assign_response.status_code, 200, assign_response.text)

        delete_response = self.client.delete(
            f"/api/v1/teacher/materials/{self.adapted_material_id}",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )
        self.assertEqual(delete_response.status_code, 200, delete_response.text)

        list_response = self.client.get(
            "/api/v1/student/materials",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        self.assertEqual(list_response.status_code, 200, list_response.text)
        items = list_response.json()["items"]
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["title"], "Adapted group for soft delete")
        self.assertEqual(items[0]["preview_text"], "Адаптированный текст для удаления.")
        self.assertTrue(items[0]["is_adapted"])

        detail_response = self.client.get(
            f"/api/v1/student/materials/{self.adapted_material_id}",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        self.assertEqual(detail_response.status_code, 200, detail_response.text)
        payload = detail_response.json()
        self.assertEqual(payload["title"], "Adapted group for soft delete")
        self.assertEqual(payload["original_text"], "Адаптированный текст для удаления.")
        self.assertTrue(payload["is_adapted"])


if __name__ == "__main__":
    unittest.main()
