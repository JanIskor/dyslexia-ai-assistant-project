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
from app.models.user import User
from app.schemas.learning_materials import TeacherLearningMaterialCreateRequest
from app.services.auth_service import get_password_hash
from app.services.learning_materials_service import save_or_update_adapted_learning_material


class ApiContractPolishEndpointsTests(unittest.TestCase):
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
            db.query(LearningMaterial).delete()
            db.query(User).delete()
            db.commit()

            self.teacher_id = uuid.uuid4()
            self.other_teacher_id = uuid.uuid4()
            self.student_id = uuid.uuid4()
            self.admin_id = uuid.uuid4()
            self.source_material_id = uuid.uuid4()

            db.add_all(
                [
                    User(
                        id=self.teacher_id,
                        email="teacher.contract@example.com",
                        password_hash=get_password_hash("TeacherContract123!"),
                        role="teacher",
                        is_active=True,
                    ),
                    User(
                        id=self.other_teacher_id,
                        email="teacher.other.contract@example.com",
                        password_hash=get_password_hash("TeacherOther123!"),
                        role="teacher",
                        is_active=True,
                    ),
                    User(
                        id=self.student_id,
                        email="student.contract@example.com",
                        password_hash=get_password_hash("StudentContract123!"),
                        role="student",
                        is_active=True,
                    ),
                    User(
                        id=self.admin_id,
                        email="admin.contract@example.com",
                        password_hash=get_password_hash("AdminContract123!"),
                        role="admin",
                        is_active=True,
                    ),
                ]
            )
            db.add(
                LearningMaterial(
                    id=self.source_material_id,
                    teacher_user_id=self.teacher_id,
                    title="Источник для API polish",
                    original_text="Исходный текст для compare и adaptation versions.",
                    adapted_text=None,
                    source_type=None,
                    source_material_id=None,
                    source_filename=None,
                    adaptation_mode=None,
                )
            )
            db.commit()

            basic_response, _ = save_or_update_adapted_learning_material(
                db,
                teacher_user_id=self.teacher_id,
                payload=TeacherLearningMaterialCreateRequest(
                    title="Группа версий",
                    original_text="Исходный текст для compare и adaptation versions.",
                    adapted_text="Базовая версия для compare endpoint.",
                    source_type="material",
                    source_material_id=self.source_material_id,
                    adaptation_mode="basic_simplify",
                ),
            )
            structured_response, _ = save_or_update_adapted_learning_material(
                db,
                teacher_user_id=self.teacher_id,
                payload=TeacherLearningMaterialCreateRequest(
                    title="Группа версий",
                    original_text="Исходный текст для compare и adaptation versions.",
                    adapted_text="Структурированная версия для compare endpoint.",
                    source_type="material",
                    source_material_id=self.source_material_id,
                    adaptation_mode="structured_explanation",
                ),
            )
            self.basic_version_id = basic_response.id
            self.structured_version_id = structured_response.id

    def _login(self, email: str, password: str) -> str:
        response = self.client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": password},
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()["access_token"]

    def test_post_logout_returns_confirmation(self) -> None:
        token = self._login("teacher.contract@example.com", "TeacherContract123!")

        response = self.client.post(
            "/api/v1/auth/logout",
            headers={"Authorization": f"Bearer {token}"},
        )

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json(), {"detail": "Logged out"})

    def test_compare_endpoint_is_teacher_only_and_returns_compare_ready_payload(self) -> None:
        teacher_token = self._login("teacher.contract@example.com", "TeacherContract123!")
        student_token = self._login("student.contract@example.com", "StudentContract123!")
        admin_token = self._login("admin.contract@example.com", "AdminContract123!")

        response = self.client.get(
            f"/api/v1/teacher/materials/{self.structured_version_id}/compare",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertEqual(payload["material_id"], str(self.structured_version_id))
        self.assertEqual(payload["title"], "Группа версий")
        self.assertEqual(
            payload["original_text"],
            "Исходный текст для compare и adaptation versions.",
        )
        self.assertEqual(
            payload["current_adapted_text"],
            "Структурированная версия для compare endpoint.",
        )
        self.assertEqual(payload["current_adaptation_mode"], "structured_explanation")
        self.assertEqual(len(payload["available_adaptation_versions"]), 2)
        self.assertEqual(
            {item["adaptation_mode"] for item in payload["available_adaptation_versions"]},
            {"basic_simplify", "structured_explanation"},
        )
        self.assertIsNotNone(payload["source_info"])

        student_response = self.client.get(
            f"/api/v1/teacher/materials/{self.structured_version_id}/compare",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        self.assertEqual(student_response.status_code, 403, student_response.text)
        self.assertEqual(student_response.json()["detail"], "Teacher access required")

        admin_response = self.client.get(
            f"/api/v1/teacher/materials/{self.structured_version_id}/compare",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        self.assertEqual(admin_response.status_code, 403, admin_response.text)
        self.assertEqual(admin_response.json()["detail"], "Teacher access required")

    def test_adaptation_versions_endpoint_returns_versions_for_material_group(self) -> None:
        teacher_token = self._login("teacher.contract@example.com", "TeacherContract123!")

        response = self.client.get(
            f"/api/v1/teacher/materials/{self.basic_version_id}/adaptation-versions",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )

        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertEqual(payload["material_id"], str(self.basic_version_id))
        self.assertEqual(len(payload["items"]), 2)
        self.assertEqual(
            {item["adaptation_mode"] for item in payload["items"]},
            {"basic_simplify", "structured_explanation"},
        )

    def test_other_teacher_cannot_access_foreign_material_compare_or_versions(self) -> None:
        other_teacher_token = self._login(
            "teacher.other.contract@example.com",
            "TeacherOther123!",
        )

        compare_response = self.client.get(
            f"/api/v1/teacher/materials/{self.basic_version_id}/compare",
            headers={"Authorization": f"Bearer {other_teacher_token}"},
        )
        self.assertEqual(compare_response.status_code, 404, compare_response.text)
        self.assertEqual(compare_response.json()["detail"], "Learning material not found")

        versions_response = self.client.get(
            f"/api/v1/teacher/materials/{self.basic_version_id}/adaptation-versions",
            headers={"Authorization": f"Bearer {other_teacher_token}"},
        )
        self.assertEqual(versions_response.status_code, 404, versions_response.text)
        self.assertEqual(versions_response.json()["detail"], "Learning material not found")


if __name__ == "__main__":
    unittest.main()
