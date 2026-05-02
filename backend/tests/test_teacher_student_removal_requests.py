import unittest
import uuid
from collections.abc import Iterator
from datetime import date

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.dependencies import get_db
from app.main import app
from app.models.notification import Notification
from app.models.student_profile import StudentProfile
from app.models.student_teacher_removal_request import StudentTeacherRemovalRequest
from app.models.teacher_profile import TeacherProfile
from app.models.teacher_student import TeacherStudent
from app.models.user import User
from app.services.auth_service import get_password_hash
from app.services.student_profile_service import get_student_mode


class TeacherStudentRemovalRequestTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        cls.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=cls.engine)
        User.__table__.create(bind=cls.engine, checkfirst=True)
        TeacherProfile.__table__.create(bind=cls.engine, checkfirst=True)
        StudentProfile.__table__.create(bind=cls.engine, checkfirst=True)
        TeacherStudent.__table__.create(bind=cls.engine, checkfirst=True)
        Notification.__table__.create(bind=cls.engine, checkfirst=True)
        StudentTeacherRemovalRequest.__table__.create(bind=cls.engine, checkfirst=True)

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
            db.query(StudentTeacherRemovalRequest).delete()
            db.query(Notification).delete()
            db.query(TeacherStudent).delete()
            db.query(StudentProfile).delete()
            db.query(TeacherProfile).delete()
            db.query(User).delete()
            db.commit()

            self.teacher_id = uuid.uuid4()
            self.other_teacher_id = uuid.uuid4()
            self.student_id = uuid.uuid4()
            self.foreign_student_id = uuid.uuid4()
            self.admin_id = uuid.uuid4()

            db.add_all(
                [
                    User(
                        id=self.teacher_id,
                        email="teacher.removal@example.com",
                        password_hash=get_password_hash("TeacherRemoval123!"),
                        role="teacher",
                        is_active=True,
                    ),
                    User(
                        id=self.other_teacher_id,
                        email="teacher.other.removal@example.com",
                        password_hash=get_password_hash("TeacherOtherRemoval123!"),
                        role="teacher",
                        is_active=True,
                    ),
                    User(
                        id=self.student_id,
                        email="student.removal@example.com",
                        password_hash=get_password_hash("StudentRemoval123!"),
                        role="student",
                        is_active=True,
                    ),
                    User(
                        id=self.foreign_student_id,
                        email="student.foreign.removal@example.com",
                        password_hash=get_password_hash("StudentForeignRemoval123!"),
                        role="student",
                        is_active=True,
                    ),
                    User(
                        id=self.admin_id,
                        email="admin.removal@example.com",
                        password_hash=get_password_hash("AdminRemoval123!"),
                        role="admin",
                        is_active=True,
                    ),
                ]
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
                        work_email="teacher.removal@example.com",
                        subject_name="Литература",
                    ),
                    TeacherProfile(
                        id=uuid.uuid4(),
                        user_id=self.other_teacher_id,
                        full_name="Соколова Ирина Андреевна",
                        birth_date=date(1989, 7, 14),
                        gender="Женский",
                        position="Преподаватель",
                        phone="+79000000002",
                        work_email="teacher.other.removal@example.com",
                        subject_name="Русский язык",
                    ),
                ]
            )
            db.add_all(
                [
                    StudentProfile(
                        id=uuid.uuid4(),
                        user_id=self.student_id,
                        full_name="Иванов Андрей Викторович",
                        birth_date=date(2010, 1, 23),
                        gender="Мужской",
                        grade_label="4А класс",
                        enrollment_date=date(2017, 9, 3),
                        quote="Тестовый профиль ученика",
                        profile_status="teacher_accepted",
                        current_teacher_user_id=self.teacher_id,
                        teacher_review_status="accepted",
                    ),
                    StudentProfile(
                        id=uuid.uuid4(),
                        user_id=self.foreign_student_id,
                        full_name="Петров Артём Сергеевич",
                        birth_date=date(2011, 3, 11),
                        gender="Мужской",
                        grade_label="5Б класс",
                        enrollment_date=date(2018, 9, 3),
                        quote="Чужой ученик",
                        profile_status="teacher_accepted",
                        current_teacher_user_id=self.other_teacher_id,
                        teacher_review_status="accepted",
                    ),
                ]
            )
            db.add_all(
                [
                    TeacherStudent(
                        id=uuid.uuid4(),
                        teacher_user_id=self.teacher_id,
                        student_user_id=self.student_id,
                    ),
                    TeacherStudent(
                        id=uuid.uuid4(),
                        teacher_user_id=self.other_teacher_id,
                        student_user_id=self.foreign_student_id,
                    ),
                ]
            )
            db.commit()

    def _login(self, email: str, password: str) -> str:
        response = self.client.post("/api/v1/auth/login", json={"email": email, "password": password})
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()["access_token"]

    def _create_pending_request(self) -> dict:
        teacher_token = self._login("teacher.removal@example.com", "TeacherRemoval123!")
        response = self.client.post(
            f"/api/v1/teacher/students/{self.student_id}/removal-requests",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={"reason": "Нужен другой формат сопровождения."},
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def _create_pending_request_for_other_teacher(self) -> dict:
        teacher_token = self._login("teacher.other.removal@example.com", "TeacherOtherRemoval123!")
        response = self.client.post(
            f"/api/v1/teacher/students/{self.foreign_student_id}/removal-requests",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={"reason": "Вторая заявка для bulk delete."},
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def test_teacher_can_create_removal_request_for_own_student(self) -> None:
        payload = self._create_pending_request()

        self.assertEqual(payload["status"], "pending")
        self.assertEqual(payload["teacher"]["user_id"], str(self.teacher_id))
        self.assertEqual(payload["student"]["user_id"], str(self.student_id))
        self.assertEqual(payload["reason"], "Нужен другой формат сопровождения.")

        with self.SessionLocal() as db:
            request = db.query(StudentTeacherRemovalRequest).first()
            self.assertIsNotNone(request)
            self.assertEqual(request.status, "pending")
            admin_notifications = (
                db.query(Notification)
                .filter(
                    Notification.role == "admin",
                    Notification.type == "student_removal_request_created",
                )
                .all()
            )
            self.assertEqual(len(admin_notifications), 1)

    def test_teacher_cannot_create_request_for_foreign_student(self) -> None:
        teacher_token = self._login("teacher.removal@example.com", "TeacherRemoval123!")

        response = self.client.post(
            f"/api/v1/teacher/students/{self.foreign_student_id}/removal-requests",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={"reason": "Попытка чужого доступа"},
        )

        self.assertEqual(response.status_code, 404, response.text)
        self.assertEqual(response.json()["detail"], "Teacher student not found")

    def test_duplicate_pending_request_is_rejected(self) -> None:
        self._create_pending_request()
        teacher_token = self._login("teacher.removal@example.com", "TeacherRemoval123!")

        response = self.client.post(
            f"/api/v1/teacher/students/{self.student_id}/removal-requests",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={"reason": "Повторная заявка"},
        )

        self.assertEqual(response.status_code, 400, response.text)
        self.assertEqual(response.json()["detail"], "Removal request already exists")

    def test_admin_can_approve_request_and_student_becomes_unassigned(self) -> None:
        request_payload = self._create_pending_request()
        admin_token = self._login("admin.removal@example.com", "AdminRemoval123!")

        patch_response = self.client.patch(
            f"/api/v1/admin/student-removal-requests/{request_payload['id']}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"action": "approve", "admin_comment": "Подтверждено."},
        )
        self.assertEqual(patch_response.status_code, 200, patch_response.text)
        self.assertEqual(patch_response.json()["status"], "approved")

        list_response = self.client.get(
            "/api/v1/admin/student-removal-requests",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        self.assertEqual(list_response.status_code, 200, list_response.text)
        self.assertEqual(list_response.json()["items"][0]["status"], "approved")

        teacher_list_response = self.client.get(
            "/api/v1/teacher/students",
            headers={"Authorization": f"Bearer {self._login('teacher.removal@example.com', 'TeacherRemoval123!')}"},
        )
        self.assertEqual(teacher_list_response.status_code, 200, teacher_list_response.text)
        self.assertEqual(teacher_list_response.json()["items"], [])

        with self.SessionLocal() as db:
            assignment = (
                db.query(TeacherStudent)
                .filter(
                    TeacherStudent.teacher_user_id == self.teacher_id,
                    TeacherStudent.student_user_id == self.student_id,
                )
                .first()
            )
            self.assertIsNone(assignment)

            profile = db.query(StudentProfile).filter(StudentProfile.user_id == self.student_id).first()
            self.assertIsNotNone(profile)
            self.assertEqual(profile.profile_status, "approved")
            self.assertIsNone(profile.current_teacher_user_id)
            self.assertIsNone(profile.teacher_review_status)
            self.assertEqual(get_student_mode(db, student_user_id=self.student_id), "onboarding")

            teacher_notifications = (
                db.query(Notification)
                .filter(
                    Notification.user_id == self.teacher_id,
                    Notification.type == "student_removal_request_approved",
                )
                .all()
            )
            self.assertEqual(len(teacher_notifications), 1)

    def test_admin_can_reject_request_and_relation_is_kept(self) -> None:
        request_payload = self._create_pending_request()
        admin_token = self._login("admin.removal@example.com", "AdminRemoval123!")

        patch_response = self.client.patch(
            f"/api/v1/admin/student-removal-requests/{request_payload['id']}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"action": "reject", "admin_comment": "Оснований недостаточно."},
        )
        self.assertEqual(patch_response.status_code, 200, patch_response.text)
        self.assertEqual(patch_response.json()["status"], "rejected")

        with self.SessionLocal() as db:
            assignment = (
                db.query(TeacherStudent)
                .filter(
                    TeacherStudent.teacher_user_id == self.teacher_id,
                    TeacherStudent.student_user_id == self.student_id,
                )
                .first()
            )
            self.assertIsNotNone(assignment)
            teacher_notifications = (
                db.query(Notification)
                .filter(
                    Notification.user_id == self.teacher_id,
                    Notification.type == "student_removal_request_rejected",
                )
                .all()
            )
            self.assertEqual(len(teacher_notifications), 1)

    def test_student_and_admin_cannot_create_teacher_request(self) -> None:
        student_token = self._login("student.removal@example.com", "StudentRemoval123!")
        admin_token = self._login("admin.removal@example.com", "AdminRemoval123!")

        student_response = self.client.post(
            f"/api/v1/teacher/students/{self.student_id}/removal-requests",
            headers={"Authorization": f"Bearer {student_token}"},
            json={"reason": "Недоступно"},
        )
        self.assertEqual(student_response.status_code, 403, student_response.text)
        self.assertEqual(student_response.json()["detail"], "Teacher access required")

        admin_response = self.client.post(
            f"/api/v1/teacher/students/{self.student_id}/removal-requests",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"reason": "Недоступно"},
        )
        self.assertEqual(admin_response.status_code, 403, admin_response.text)
        self.assertEqual(admin_response.json()["detail"], "Teacher access required")

    def test_teacher_and_student_cannot_resolve_admin_request(self) -> None:
        request_payload = self._create_pending_request()
        teacher_token = self._login("teacher.removal@example.com", "TeacherRemoval123!")
        student_token = self._login("student.removal@example.com", "StudentRemoval123!")

        teacher_response = self.client.patch(
            f"/api/v1/admin/student-removal-requests/{request_payload['id']}",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={"action": "approve"},
        )
        self.assertEqual(teacher_response.status_code, 403, teacher_response.text)
        self.assertEqual(teacher_response.json()["detail"], "Admin access required")

        student_response = self.client.patch(
            f"/api/v1/admin/student-removal-requests/{request_payload['id']}",
            headers={"Authorization": f"Bearer {student_token}"},
            json={"action": "reject"},
        )
        self.assertEqual(student_response.status_code, 403, student_response.text)
        self.assertEqual(student_response.json()["detail"], "Admin access required")

    def test_admin_can_bulk_delete_removal_requests_by_ids(self) -> None:
        first_request = self._create_pending_request()
        second_request = self._create_pending_request_for_other_teacher()
        admin_token = self._login("admin.removal@example.com", "AdminRemoval123!")
        resolve_response = self.client.patch(
            f"/api/v1/admin/student-removal-requests/{first_request['id']}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"action": "reject"},
        )
        self.assertEqual(resolve_response.status_code, 200, resolve_response.text)

        response = self.client.request(
            "DELETE",
            "/api/v1/admin/student-removal-requests",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"ids": [first_request["id"]], "delete_all": False},
        )

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["deleted_count"], 1)

        list_response = self.client.get(
            "/api/v1/admin/student-removal-requests",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        self.assertEqual(list_response.status_code, 200, list_response.text)
        remaining_ids = [item["id"] for item in list_response.json()["items"]]
        self.assertNotIn(first_request["id"], remaining_ids)
        self.assertIn(second_request["id"], remaining_ids)

        with self.SessionLocal() as db:
            deleted_request = (
                db.query(StudentTeacherRemovalRequest)
                .filter(StudentTeacherRemovalRequest.id == uuid.UUID(first_request["id"]))
                .first()
            )
            self.assertIsNotNone(deleted_request)
            self.assertIsNotNone(deleted_request.deleted_at)

    def test_admin_can_bulk_delete_all_removal_requests(self) -> None:
        first_request = self._create_pending_request()
        second_request = self._create_pending_request_for_other_teacher()
        admin_token = self._login("admin.removal@example.com", "AdminRemoval123!")
        for request_payload in (first_request, second_request):
            resolve_response = self.client.patch(
                f"/api/v1/admin/student-removal-requests/{request_payload['id']}",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={"action": "reject"},
            )
            self.assertEqual(resolve_response.status_code, 200, resolve_response.text)

        response = self.client.request(
            "DELETE",
            "/api/v1/admin/student-removal-requests",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"ids": [], "delete_all": True},
        )

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["deleted_count"], 2)

        list_response = self.client.get(
            "/api/v1/admin/student-removal-requests",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        self.assertEqual(list_response.status_code, 200, list_response.text)
        self.assertEqual(list_response.json()["items"], [])

    def test_bulk_delete_unknown_id_is_safe(self) -> None:
        self._create_pending_request()
        admin_token = self._login("admin.removal@example.com", "AdminRemoval123!")

        response = self.client.request(
            "DELETE",
            "/api/v1/admin/student-removal-requests",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"ids": [str(uuid.uuid4())], "delete_all": False},
        )

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["deleted_count"], 0)

        list_response = self.client.get(
            "/api/v1/admin/student-removal-requests",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        self.assertEqual(len(list_response.json()["items"]), 1)

    def test_pending_removal_requests_are_not_deleted(self) -> None:
        request_payload = self._create_pending_request()
        admin_token = self._login("admin.removal@example.com", "AdminRemoval123!")

        response = self.client.request(
            "DELETE",
            "/api/v1/admin/student-removal-requests",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"ids": [request_payload["id"]], "delete_all": False},
        )

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["deleted_count"], 0)

        list_response = self.client.get(
            "/api/v1/admin/student-removal-requests",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        self.assertEqual(list_response.status_code, 200, list_response.text)
        remaining_ids = [item["id"] for item in list_response.json()["items"]]
        self.assertIn(request_payload["id"], remaining_ids)

    def test_non_admin_cannot_bulk_delete_removal_requests(self) -> None:
        request_payload = self._create_pending_request()
        teacher_token = self._login("teacher.removal@example.com", "TeacherRemoval123!")

        response = self.client.request(
            "DELETE",
            "/api/v1/admin/student-removal-requests",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={"ids": [request_payload["id"]], "delete_all": False},
        )

        self.assertEqual(response.status_code, 403, response.text)
        self.assertEqual(response.json()["detail"], "Admin access required")


if __name__ == "__main__":
    unittest.main()
