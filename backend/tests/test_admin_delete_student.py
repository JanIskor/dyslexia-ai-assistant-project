import unittest
import uuid
from collections.abc import Iterator
from datetime import date

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.dependencies import get_db
from app.main import app
from app.models.learning_material import LearningMaterial
from app.models.notification import Notification
from app.models.student_learning_material import StudentLearningMaterial
from app.models.student_profile import StudentProfile
from app.models.student_teacher_removal_request import StudentTeacherRemovalRequest
from app.models.teacher_profile import TeacherProfile
from app.models.teacher_student import TeacherStudent
from app.models.user import User
from app.services.auth_service import get_password_hash


class AdminDeleteStudentTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )

        @event.listens_for(cls.engine, "connect")
        def register_sqlite_functions(dbapi_connection, connection_record):  # type: ignore[no-untyped-def]
            _ = connection_record

            def split_part(value: str | None, delimiter: str, index: int) -> str:
                if value is None:
                    return ""
                parts = value.split(delimiter)
                if index <= 0 or index > len(parts):
                    return ""
                return parts[index - 1]

            dbapi_connection.create_function("split_part", 3, split_part)

        cls.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=cls.engine)
        User.__table__.create(bind=cls.engine, checkfirst=True)
        TeacherProfile.__table__.create(bind=cls.engine, checkfirst=True)
        StudentProfile.__table__.create(bind=cls.engine, checkfirst=True)
        TeacherStudent.__table__.create(bind=cls.engine, checkfirst=True)
        StudentTeacherRemovalRequest.__table__.create(bind=cls.engine, checkfirst=True)
        Notification.__table__.create(bind=cls.engine, checkfirst=True)
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
            db.query(Notification).delete()
            db.query(StudentTeacherRemovalRequest).delete()
            db.query(TeacherStudent).delete()
            db.query(StudentProfile).delete()
            db.query(TeacherProfile).delete()
            db.query(User).delete()
            db.commit()

            self.admin_id = uuid.uuid4()
            self.teacher_id = uuid.uuid4()
            self.student_assigned_id = uuid.uuid4()
            self.student_unassigned_id = uuid.uuid4()
            self.other_teacher_id = uuid.uuid4()
            self.assigned_application_id = uuid.uuid4()
            self.unassigned_application_id = uuid.uuid4()
            self.non_student_user_id = uuid.uuid4()
            self.material_id = uuid.uuid4()
            self.snapshot_id = uuid.uuid4()

            db.add_all(
                [
                    User(
                        id=self.admin_id,
                        email="admin.delete.student@example.com",
                        password_hash=get_password_hash("AdminDeleteStudent123!"),
                        role="admin",
                        is_active=True,
                    ),
                    User(
                        id=self.teacher_id,
                        email="teacher.delete.student@example.com",
                        password_hash=get_password_hash("TeacherDeleteStudent123!"),
                        role="teacher",
                        is_active=True,
                    ),
                    User(
                        id=self.other_teacher_id,
                        email="teacher.other.delete.student@example.com",
                        password_hash=get_password_hash("OtherTeacherDeleteStudent123!"),
                        role="teacher",
                        is_active=True,
                    ),
                    User(
                        id=self.student_assigned_id,
                        email="student.assigned.delete.student@example.com",
                        password_hash=get_password_hash("StudentAssignedDeleteStudent123!"),
                        role="student",
                        is_active=True,
                    ),
                    User(
                        id=self.student_unassigned_id,
                        email="student.unassigned.delete.student@example.com",
                        password_hash=get_password_hash("StudentUnassignedDeleteStudent123!"),
                        role="student",
                        is_active=True,
                    ),
                ]
            )
            db.add(
                User(
                    id=self.non_student_user_id,
                    email="teacher.nondeletable.student@example.com",
                    password_hash=get_password_hash("TeacherNonStudent123!"),
                    role="teacher",
                    is_active=True,
                )
            )

            db.add_all(
                [
                    TeacherProfile(
                        id=uuid.uuid4(),
                        user_id=self.teacher_id,
                        full_name="Попов Михаил Петрович",
                        birth_date=date(1985, 11, 17),
                        gender="Мужской",
                        position="Преподаватель",
                        phone="+79000000001",
                        work_email="teacher.delete.student@example.com",
                        subject_name="Литература",
                    ),
                    TeacherProfile(
                        id=uuid.uuid4(),
                        user_id=self.other_teacher_id,
                        full_name="Соколова Ирина Андреевна",
                        birth_date=date(1988, 2, 9),
                        gender="Женский",
                        position="Преподаватель",
                        phone="+79000000002",
                        work_email="teacher.other.delete.student@example.com",
                        subject_name="Русский язык",
                    ),
                    TeacherProfile(
                        id=uuid.uuid4(),
                        user_id=self.non_student_user_id,
                        full_name="Неподходящий Пользователь",
                        birth_date=date(1987, 8, 8),
                        gender="Женский",
                        position="Преподаватель",
                        phone="+79000000003",
                        work_email="teacher.nondeletable.student@example.com",
                        subject_name="История",
                    ),
                ]
            )

            db.add_all(
                [
                    StudentProfile(
                        id=self.assigned_application_id,
                        user_id=self.student_assigned_id,
                        full_name="Иванов Андрей Викторович",
                        birth_date=date(2010, 1, 23),
                        gender="Мужской",
                        grade_label="4А класс",
                        enrollment_date=date(2017, 9, 3),
                        quote="Назначенный ученик",
                        profile_status="teacher_accepted",
                        current_teacher_user_id=self.teacher_id,
                        teacher_review_status="accepted",
                    ),
                    StudentProfile(
                        id=self.unassigned_application_id,
                        user_id=self.student_unassigned_id,
                        full_name="Петров Артём Сергеевич",
                        birth_date=date(2011, 3, 11),
                        gender="Мужской",
                        grade_label="5Б класс",
                        enrollment_date=date(2018, 9, 3),
                        quote="Ученик без преподавателя",
                        profile_status="approved",
                        current_teacher_user_id=None,
                        teacher_review_status=None,
                    ),
                ]
            )

            db.add(
                TeacherStudent(
                    id=uuid.uuid4(),
                    teacher_user_id=self.teacher_id,
                    student_user_id=self.student_assigned_id,
                )
            )

            db.add(
                LearningMaterial(
                    id=self.material_id,
                    teacher_user_id=self.teacher_id,
                    title="Материал для snapshot",
                    original_text="Исходный текст",
                    adapted_text="Адаптированный текст",
                    source_type=None,
                    source_material_id=None,
                    source_filename=None,
                    adaptation_mode="basic_simplify",
                )
            )
            db.add(
                StudentLearningMaterial(
                    id=self.snapshot_id,
                    student_user_id=self.student_assigned_id,
                    learning_material_id=self.material_id,
                    assigned_by_teacher_user_id=self.teacher_id,
                    assigned_title="Старый snapshot",
                    assigned_text="Содержимое snapshot",
                    assigned_adaptation_mode="basic_simplify",
                    assigned_is_adapted=True,
                )
            )
            db.commit()

    def _login(self, email: str, password: str) -> str:
        response = self.client.post("/api/v1/auth/login", json={"email": email, "password": password})
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()["access_token"]

    def test_admin_can_delete_active_student_without_teacher(self) -> None:
        token = self._login("admin.delete.student@example.com", "AdminDeleteStudent123!")

        response = self.client.delete(
            f"/api/v1/admin/students/{self.student_unassigned_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertEqual(payload["detail"], "Student deleted")
        self.assertEqual(payload["student_user_id"], str(self.student_unassigned_id))
        self.assertIsNone(payload["notified_teacher_user_id"])

        with self.SessionLocal() as db:
            student_user = db.query(User).filter(User.id == self.student_unassigned_id).first()
            self.assertIsNotNone(student_user)
            self.assertFalse(student_user.is_active)

            relation = db.query(TeacherStudent).filter(TeacherStudent.student_user_id == self.student_unassigned_id).first()
            self.assertIsNone(relation)

            notifications = db.query(Notification).filter(Notification.user_id == self.teacher_id).all()
            self.assertEqual(notifications, [])

    def test_admin_can_delete_active_student_with_teacher(self) -> None:
        token = self._login("admin.delete.student@example.com", "AdminDeleteStudent123!")

        response = self.client.delete(
            f"/api/v1/admin/students/{self.student_assigned_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["notified_teacher_user_id"], str(self.teacher_id))

        with self.SessionLocal() as db:
            student_user = db.query(User).filter(User.id == self.student_assigned_id).first()
            self.assertIsNotNone(student_user)
            self.assertFalse(student_user.is_active)

            relation = db.query(TeacherStudent).filter(TeacherStudent.student_user_id == self.student_assigned_id).first()
            self.assertIsNone(relation)

            profile = db.query(StudentProfile).filter(StudentProfile.user_id == self.student_assigned_id).first()
            self.assertIsNotNone(profile)
            self.assertIsNone(profile.current_teacher_user_id)
            self.assertIsNone(profile.teacher_review_status)

            teacher_notifications = (
                db.query(Notification)
                .filter(
                    Notification.user_id == self.teacher_id,
                    Notification.type == "student_deleted_by_admin",
                )
                .all()
            )
            self.assertEqual(len(teacher_notifications), 1)
            self.assertEqual(teacher_notifications[0].title, "Ученик удалён администратором")
            self.assertIn("Иванов Андрей Викторович", teacher_notifications[0].message)

    def test_deleted_student_not_in_unassigned_list(self) -> None:
        token = self._login("admin.delete.student@example.com", "AdminDeleteStudent123!")

        delete_response = self.client.delete(
            f"/api/v1/admin/students/{self.student_unassigned_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(delete_response.status_code, 200, delete_response.text)

        list_response = self.client.get(
            "/api/v1/admin/students/unassigned",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(list_response.status_code, 200, list_response.text)
        returned_ids = {item["user_id"] for item in list_response.json()["items"]}
        self.assertNotIn(str(self.student_unassigned_id), returned_ids)

    def test_deleted_student_not_in_teacher_student_list(self) -> None:
        admin_token = self._login("admin.delete.student@example.com", "AdminDeleteStudent123!")
        teacher_token = self._login("teacher.delete.student@example.com", "TeacherDeleteStudent123!")

        delete_response = self.client.delete(
            f"/api/v1/admin/students/{self.student_assigned_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        self.assertEqual(delete_response.status_code, 200, delete_response.text)

        teacher_list_response = self.client.get(
            "/api/v1/teacher/students",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )
        self.assertEqual(teacher_list_response.status_code, 200, teacher_list_response.text)
        self.assertEqual(teacher_list_response.json()["items"], [])

    def test_deleted_student_not_in_active_student_list_and_detail(self) -> None:
        token = self._login("admin.delete.student@example.com", "AdminDeleteStudent123!")

        delete_response = self.client.delete(
            f"/api/v1/admin/students/{self.student_unassigned_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(delete_response.status_code, 200, delete_response.text)

        list_response = self.client.get(
            "/api/v1/admin/students",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(list_response.status_code, 200, list_response.text)
        listed_ids = {item["id"] for item in list_response.json()["items"]}
        self.assertNotIn(str(self.student_unassigned_id), listed_ids)

        detail_response = self.client.get(
            f"/api/v1/admin/students/{self.student_unassigned_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(detail_response.status_code, 404, detail_response.text)

    def test_deleted_student_cannot_be_assigned_to_teacher(self) -> None:
        token = self._login("admin.delete.student@example.com", "AdminDeleteStudent123!")

        delete_response = self.client.delete(
            f"/api/v1/admin/students/{self.student_unassigned_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(delete_response.status_code, 200, delete_response.text)

        assign_response = self.client.post(
            f"/api/v1/admin/applications/{self.unassigned_application_id}/assign-teacher",
            headers={"Authorization": f"Bearer {token}"},
            json={"teacher_user_id": str(self.other_teacher_id)},
        )
        self.assertEqual(assign_response.status_code, 404, assign_response.text)
        self.assertEqual(assign_response.json()["detail"], "Student profile not found")

    def test_deleted_student_cannot_log_in(self) -> None:
        admin_token = self._login("admin.delete.student@example.com", "AdminDeleteStudent123!")

        delete_response = self.client.delete(
            f"/api/v1/admin/students/{self.student_unassigned_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        self.assertEqual(delete_response.status_code, 200, delete_response.text)

        login_response = self.client.post(
            "/api/v1/auth/login",
            json={
                "email": "student.unassigned.delete.student@example.com",
                "password": "StudentUnassignedDeleteStudent123!",
            },
        )
        self.assertEqual(login_response.status_code, 401, login_response.text)
        self.assertEqual(login_response.json()["detail"], "Incorrect email or password")

    def test_non_admin_cannot_delete_student(self) -> None:
        teacher_token = self._login("teacher.delete.student@example.com", "TeacherDeleteStudent123!")

        response = self.client.delete(
            f"/api/v1/admin/students/{self.student_unassigned_id}",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )

        self.assertEqual(response.status_code, 403, response.text)
        self.assertEqual(response.json()["detail"], "Admin access required")

    def test_cannot_delete_non_student_user(self) -> None:
        token = self._login("admin.delete.student@example.com", "AdminDeleteStudent123!")

        response = self.client.delete(
            f"/api/v1/admin/students/{self.non_student_user_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        self.assertEqual(response.status_code, 404, response.text)
        self.assertEqual(response.json()["detail"], "Student not found")

    def test_student_snapshots_remain_after_delete(self) -> None:
        token = self._login("admin.delete.student@example.com", "AdminDeleteStudent123!")

        response = self.client.delete(
            f"/api/v1/admin/students/{self.student_assigned_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(response.status_code, 200, response.text)

        with self.SessionLocal() as db:
            snapshot = db.query(StudentLearningMaterial).filter(StudentLearningMaterial.id == self.snapshot_id).first()
            material = db.query(LearningMaterial).filter(LearningMaterial.id == self.material_id).first()
            self.assertIsNotNone(snapshot)
            self.assertIsNotNone(material)
            self.assertEqual(snapshot.assigned_title, "Старый snapshot")
            self.assertEqual(snapshot.assigned_text, "Содержимое snapshot")


if __name__ == "__main__":
    unittest.main()
