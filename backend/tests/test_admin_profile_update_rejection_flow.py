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
from app.models.student_profile_update_request import StudentProfileUpdateRequest
from app.models.teacher_profile import TeacherProfile
from app.models.teacher_profile_update_request import TeacherProfileUpdateRequest
from app.models.user import User
from app.services.auth_service import get_password_hash


class AdminProfileUpdateRejectionFlowTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        cls.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=cls.engine)
        User.__table__.create(bind=cls.engine, checkfirst=True)
        StudentProfile.__table__.create(bind=cls.engine, checkfirst=True)
        TeacherProfile.__table__.create(bind=cls.engine, checkfirst=True)
        StudentProfileUpdateRequest.__table__.create(bind=cls.engine, checkfirst=True)
        TeacherProfileUpdateRequest.__table__.create(bind=cls.engine, checkfirst=True)
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
            db.query(TeacherProfileUpdateRequest).delete()
            db.query(StudentProfileUpdateRequest).delete()
            db.query(StudentProfile).delete()
            db.query(TeacherProfile).delete()
            db.query(User).delete()
            db.commit()

            self.admin_id = uuid.uuid4()
            self.student_user_id = uuid.uuid4()
            self.teacher_user_id = uuid.uuid4()
            self.initial_student_user_id = uuid.uuid4()

            self.student_profile_id = uuid.uuid4()
            self.initial_application_id = uuid.uuid4()
            self.student_update_request_id = uuid.uuid4()
            self.teacher_update_request_id = uuid.uuid4()

            db.add_all(
                [
                    User(
                        id=self.admin_id,
                        email="admin.profile.reject@example.com",
                        password_hash=get_password_hash("AdminProfileReject123!"),
                        role="admin",
                        is_active=True,
                    ),
                    User(
                        id=self.student_user_id,
                        email="student.profile.reject@example.com",
                        password_hash=get_password_hash("StudentProfileReject123!"),
                        role="student",
                        is_active=True,
                    ),
                    User(
                        id=self.teacher_user_id,
                        email="teacher.profile.reject@example.com",
                        password_hash=get_password_hash("TeacherProfileReject123!"),
                        role="teacher",
                        is_active=True,
                    ),
                    User(
                        id=self.initial_student_user_id,
                        email="student.initial.reject@example.com",
                        password_hash=get_password_hash("StudentInitialReject123!"),
                        role="student",
                        is_active=True,
                    ),
                ]
            )

            db.add_all(
                [
                    StudentProfile(
                        id=self.student_profile_id,
                        user_id=self.student_user_id,
                        full_name="Ученик Обновление",
                        birth_date=date(2012, 4, 12),
                        gender="Женский",
                        grade_label="3В класс",
                        enrollment_date=date(2019, 9, 2),
                        quote="Подтверждённый профиль ученика",
                        profile_status="teacher_accepted",
                        current_teacher_user_id=None,
                        teacher_review_status=None,
                    ),
                    StudentProfile(
                        id=self.initial_application_id,
                        user_id=self.initial_student_user_id,
                        full_name="Первичная Заявка",
                        birth_date=date(2011, 3, 11),
                        gender="Мужской",
                        grade_label="4А класс",
                        enrollment_date=date(2018, 9, 3),
                        quote="Первичная регистрация",
                        profile_status="submitted",
                        current_teacher_user_id=None,
                        teacher_review_status=None,
                    ),
                ]
            )

            db.add(
                TeacherProfile(
                    id=uuid.uuid4(),
                    user_id=self.teacher_user_id,
                    full_name="Педагог Обновление",
                    birth_date=date(1985, 11, 17),
                    gender="Женский",
                    position="Преподаватель",
                    phone="+79000000001",
                    work_email="teacher.profile.reject@example.com",
                    subject_name="Литература",
                )
            )

            db.add_all(
                [
                    StudentProfileUpdateRequest(
                        id=self.student_update_request_id,
                        student_user_id=self.student_user_id,
                        full_name="Ученик Обновление Черновик",
                        birth_date=date(2012, 4, 13),
                        gender="Женский",
                        quote="Новая цитата",
                        status="submitted",
                    ),
                    TeacherProfileUpdateRequest(
                        id=self.teacher_update_request_id,
                        teacher_user_id=self.teacher_user_id,
                        full_name="Педагог Обновление",
                        birth_date=date(1985, 11, 17),
                        gender="Женский",
                        position="Старший преподаватель",
                        phone="+79000000099",
                        work_email="teacher.profile.reject@example.com",
                        subject_name="Русский язык",
                        status="submitted",
                    ),
                ]
            )
            db.commit()

    def _login(self, email: str, password: str) -> str:
        response = self.client.post("/api/v1/auth/login", json={"email": email, "password": password})
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()["access_token"]

    def test_admin_can_reject_student_profile_update(self) -> None:
        token = self._login("admin.profile.reject@example.com", "AdminProfileReject123!")

        response = self.client.post(
            f"/api/v1/admin/applications/{self.student_update_request_id}/reject",
            headers={"Authorization": f"Bearer {token}"},
            json={"admin_comment": "Нужно точнее заполнить дату рождения."},
        )

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["status"], "Отклонена")

        with self.SessionLocal() as db:
            update_request = (
                db.query(StudentProfileUpdateRequest)
                .filter(StudentProfileUpdateRequest.id == self.student_update_request_id)
                .first()
            )
            self.assertIsNotNone(update_request)
            self.assertEqual(update_request.status, "rejected")
            self.assertEqual(update_request.admin_comment, "Нужно точнее заполнить дату рождения.")

            student_profile = db.query(StudentProfile).filter(StudentProfile.id == self.student_profile_id).first()
            self.assertIsNotNone(student_profile)
            self.assertEqual(student_profile.full_name, "Ученик Обновление")

            notification = (
                db.query(Notification)
                .filter(
                    Notification.user_id == self.student_user_id,
                    Notification.type == "student_profile_update_rejected",
                )
                .first()
            )
            self.assertIsNotNone(notification)
            self.assertEqual(notification.title, "Изменение профиля отклонено")

    def test_admin_can_reject_teacher_profile_update(self) -> None:
        token = self._login("admin.profile.reject@example.com", "AdminProfileReject123!")

        response = self.client.post(
            f"/api/v1/admin/applications/{self.teacher_update_request_id}/reject",
            headers={"Authorization": f"Bearer {token}"},
            json={"admin_comment": "Изменение должности пока не подтверждено."},
        )

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["status"], "Отклонена")

        with self.SessionLocal() as db:
            update_request = (
                db.query(TeacherProfileUpdateRequest)
                .filter(TeacherProfileUpdateRequest.id == self.teacher_update_request_id)
                .first()
            )
            self.assertIsNotNone(update_request)
            self.assertEqual(update_request.status, "rejected")
            self.assertEqual(update_request.admin_comment, "Изменение должности пока не подтверждено.")

            notification = (
                db.query(Notification)
                .filter(
                    Notification.user_id == self.teacher_user_id,
                    Notification.type == "teacher_profile_update_rejected",
                )
                .first()
            )
            self.assertIsNotNone(notification)
            self.assertEqual(notification.title, "Изменение профиля отклонено")

    def test_rejected_update_request_is_terminal(self) -> None:
        token = self._login("admin.profile.reject@example.com", "AdminProfileReject123!")

        reject_response = self.client.post(
            f"/api/v1/admin/applications/{self.student_update_request_id}/reject",
            headers={"Authorization": f"Bearer {token}"},
            json={},
        )
        self.assertEqual(reject_response.status_code, 200, reject_response.text)

        approve_response = self.client.post(
            f"/api/v1/admin/applications/{self.student_update_request_id}/approve",
            headers={"Authorization": f"Bearer {token}"},
            json={},
        )
        self.assertEqual(approve_response.status_code, 400, approve_response.text)
        self.assertEqual(approve_response.json()["detail"], "Application cannot be approved")

    def test_rejected_update_appears_as_rejected_in_admin_applications(self) -> None:
        token = self._login("admin.profile.reject@example.com", "AdminProfileReject123!")

        reject_response = self.client.post(
            f"/api/v1/admin/applications/{self.student_update_request_id}/reject",
            headers={"Authorization": f"Bearer {token}"},
            json={},
        )
        self.assertEqual(reject_response.status_code, 200, reject_response.text)

        list_response = self.client.get(
            "/api/v1/admin/applications",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(list_response.status_code, 200, list_response.text)
        items_by_id = {item["id"]: item for item in list_response.json()["items"]}
        self.assertEqual(items_by_id[str(self.student_update_request_id)]["status"], "Отклонена")

    def test_admin_cannot_reject_initial_student_application(self) -> None:
        token = self._login("admin.profile.reject@example.com", "AdminProfileReject123!")

        response = self.client.post(
            f"/api/v1/admin/applications/{self.initial_application_id}/reject",
            headers={"Authorization": f"Bearer {token}"},
            json={},
        )

        self.assertEqual(response.status_code, 400, response.text)
        self.assertEqual(response.json()["detail"], "Initial student application cannot be rejected")

    def test_non_admin_cannot_reject_profile_update(self) -> None:
        token = self._login("teacher.profile.reject@example.com", "TeacherProfileReject123!")

        response = self.client.post(
            f"/api/v1/admin/applications/{self.teacher_update_request_id}/reject",
            headers={"Authorization": f"Bearer {token}"},
            json={},
        )

        self.assertEqual(response.status_code, 403, response.text)
        self.assertEqual(response.json()["detail"], "Admin access required")

    def test_existing_approve_and_request_changes_actions_still_work(self) -> None:
        token = self._login("admin.profile.reject@example.com", "AdminProfileReject123!")

        request_changes_response = self.client.post(
            f"/api/v1/admin/applications/{self.student_update_request_id}/request-changes",
            headers={"Authorization": f"Bearer {token}"},
            json={},
        )
        self.assertEqual(request_changes_response.status_code, 200, request_changes_response.text)
        self.assertEqual(request_changes_response.json()["status"], "На доработке")

        approve_response = self.client.post(
            f"/api/v1/admin/applications/{self.teacher_update_request_id}/approve",
            headers={"Authorization": f"Bearer {token}"},
            json={},
        )
        self.assertEqual(approve_response.status_code, 200, approve_response.text)
        self.assertEqual(approve_response.json()["status"], "Подтверждена")


if __name__ == "__main__":
    unittest.main()
