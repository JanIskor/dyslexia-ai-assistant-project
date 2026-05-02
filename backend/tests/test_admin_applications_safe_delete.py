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
from app.models.student_profile import StudentProfile
from app.models.student_profile_update_request import StudentProfileUpdateRequest
from app.models.teacher_profile import TeacherProfile
from app.models.teacher_profile_update_request import TeacherProfileUpdateRequest
from app.models.user import User
from app.services.auth_service import get_password_hash


class AdminApplicationsSafeDeleteTests(unittest.TestCase):
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
        StudentProfileUpdateRequest.__table__.create(bind=cls.engine, checkfirst=True)
        TeacherProfileUpdateRequest.__table__.create(bind=cls.engine, checkfirst=True)

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
            db.query(TeacherProfileUpdateRequest).delete()
            db.query(StudentProfileUpdateRequest).delete()
            db.query(StudentProfile).delete()
            db.query(TeacherProfile).delete()
            db.query(User).delete()
            db.commit()

            self.admin_id = uuid.uuid4()
            self.teacher_id = uuid.uuid4()
            self.student_completed_user_id = uuid.uuid4()
            self.student_active_user_id = uuid.uuid4()
            self.student_update_user_id = uuid.uuid4()
            self.student_active_update_user_id = uuid.uuid4()

            self.completed_profile_id = uuid.uuid4()
            self.active_profile_id = uuid.uuid4()
            self.student_update_request_id = uuid.uuid4()
            self.student_active_update_request_id = uuid.uuid4()
            self.teacher_update_request_id = uuid.uuid4()

            db.add_all(
                [
                    User(
                        id=self.admin_id,
                        email="admin.appdelete@example.com",
                        password_hash=get_password_hash("AdminAppDelete123!"),
                        role="admin",
                        is_active=True,
                    ),
                    User(
                        id=self.teacher_id,
                        email="teacher.appdelete@example.com",
                        password_hash=get_password_hash("TeacherAppDelete123!"),
                        role="teacher",
                        is_active=True,
                    ),
                    User(
                        id=self.student_completed_user_id,
                        email="student.completed.appdelete@example.com",
                        password_hash=get_password_hash("StudentCompletedAppDelete123!"),
                        role="student",
                        is_active=True,
                    ),
                    User(
                        id=self.student_active_user_id,
                        email="student.active.appdelete@example.com",
                        password_hash=get_password_hash("StudentActiveAppDelete123!"),
                        role="student",
                        is_active=True,
                    ),
                    User(
                        id=self.student_update_user_id,
                        email="student.update.appdelete@example.com",
                        password_hash=get_password_hash("StudentUpdateAppDelete123!"),
                        role="student",
                        is_active=True,
                    ),
                    User(
                        id=self.student_active_update_user_id,
                        email="student.activeupdate.appdelete@example.com",
                        password_hash=get_password_hash("StudentActiveUpdateAppDelete123!"),
                        role="student",
                        is_active=True,
                    ),
                ]
            )

            db.add(
                TeacherProfile(
                    id=uuid.uuid4(),
                    user_id=self.teacher_id,
                    full_name="Попов Михаил Петрович",
                    birth_date=date(1985, 11, 17),
                    gender="Мужской",
                    position="Преподаватель",
                    phone="+79000000001",
                    work_email="teacher.appdelete@example.com",
                    subject_name="Литература",
                )
            )

            db.add_all(
                [
                    StudentProfile(
                        id=self.completed_profile_id,
                        user_id=self.student_completed_user_id,
                        full_name="Завершённый Ученик",
                        birth_date=date(2010, 1, 23),
                        gender="Мужской",
                        grade_label="4А класс",
                        enrollment_date=date(2017, 9, 3),
                        quote="Завершённая заявка",
                        profile_status="teacher_accepted",
                        current_teacher_user_id=self.teacher_id,
                        teacher_review_status="accepted",
                    ),
                    StudentProfile(
                        id=self.active_profile_id,
                        user_id=self.student_active_user_id,
                        full_name="Активный Ученик",
                        birth_date=date(2011, 3, 11),
                        gender="Женский",
                        grade_label="5Б класс",
                        enrollment_date=date(2018, 9, 3),
                        quote="Требует назначения",
                        profile_status="needs_assignment",
                        current_teacher_user_id=None,
                        teacher_review_status=None,
                    ),
                    StudentProfile(
                        id=uuid.uuid4(),
                        user_id=self.student_update_user_id,
                        full_name="Ученик Обновление",
                        birth_date=date(2012, 4, 12),
                        gender="Женский",
                        grade_label="3В класс",
                        enrollment_date=date(2019, 9, 2),
                        quote="Approved update",
                        profile_status="teacher_accepted",
                        current_teacher_user_id=self.teacher_id,
                        teacher_review_status="accepted",
                    ),
                    StudentProfile(
                        id=uuid.uuid4(),
                        user_id=self.student_active_update_user_id,
                        full_name="Ученик Активное Обновление",
                        birth_date=date(2012, 6, 14),
                        gender="Мужской",
                        grade_label="3А класс",
                        enrollment_date=date(2019, 9, 2),
                        quote="Submitted update",
                        profile_status="teacher_accepted",
                        current_teacher_user_id=self.teacher_id,
                        teacher_review_status="accepted",
                    ),
                ]
            )

            db.add_all(
                [
                    StudentProfileUpdateRequest(
                        id=self.student_update_request_id,
                        student_user_id=self.student_update_user_id,
                        full_name="Ученик Обновление",
                        birth_date=date(2012, 4, 12),
                        gender="Женский",
                        quote="Approved update",
                        status="approved",
                    ),
                    StudentProfileUpdateRequest(
                        id=self.student_active_update_request_id,
                        student_user_id=self.student_active_update_user_id,
                        full_name="Ученик Активное Обновление",
                        birth_date=date(2012, 6, 14),
                        gender="Мужской",
                        quote="Submitted update",
                        status="submitted",
                    ),
                    TeacherProfileUpdateRequest(
                        id=self.teacher_update_request_id,
                        teacher_user_id=self.teacher_id,
                        full_name="Попов Михаил Петрович",
                        birth_date=date(1985, 11, 17),
                        gender="Мужской",
                        position="Старший преподаватель",
                        phone="+79000000001",
                        work_email="teacher.appdelete@example.com",
                        subject_name="Литература",
                        status="approved",
                    ),
                ]
            )
            db.commit()

    def _login(self, email: str, password: str) -> str:
        response = self.client.post("/api/v1/auth/login", json={"email": email, "password": password})
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()["access_token"]

    def test_bulk_delete_by_ids_deletes_only_completed_applications(self) -> None:
        token = self._login("admin.appdelete@example.com", "AdminAppDelete123!")

        response = self.client.request(
            "DELETE",
            "/api/v1/admin/applications",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "ids": [
                    str(self.completed_profile_id),
                    str(self.active_profile_id),
                    str(self.student_update_request_id),
                    str(self.student_active_update_request_id),
                    str(self.teacher_update_request_id),
                ]
            },
        )

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["deleted_count"], 3)

        with self.SessionLocal() as db:
            completed_profile = db.query(StudentProfile).filter(StudentProfile.id == self.completed_profile_id).first()
            active_profile = db.query(StudentProfile).filter(StudentProfile.id == self.active_profile_id).first()
            approved_update = (
                db.query(StudentProfileUpdateRequest)
                .filter(StudentProfileUpdateRequest.id == self.student_update_request_id)
                .first()
            )
            active_update = (
                db.query(StudentProfileUpdateRequest)
                .filter(StudentProfileUpdateRequest.id == self.student_active_update_request_id)
                .first()
            )
            teacher_update = (
                db.query(TeacherProfileUpdateRequest)
                .filter(TeacherProfileUpdateRequest.id == self.teacher_update_request_id)
                .first()
            )
            self.assertIsNotNone(completed_profile.admin_application_deleted_at)
            self.assertIsNone(active_profile.admin_application_deleted_at)
            self.assertIsNotNone(approved_update.deleted_at)
            self.assertIsNone(active_update.deleted_at)
            self.assertIsNotNone(teacher_update.deleted_at)

    def test_delete_all_deletes_all_available_applications(self) -> None:
        token = self._login("admin.appdelete@example.com", "AdminAppDelete123!")

        response = self.client.request(
            "DELETE",
            "/api/v1/admin/applications",
            headers={"Authorization": f"Bearer {token}"},
            json={"delete_all": True},
        )

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["deleted_count"], 3)

    def test_deleted_applications_disappear_from_list(self) -> None:
        token = self._login("admin.appdelete@example.com", "AdminAppDelete123!")

        delete_response = self.client.request(
            "DELETE",
            "/api/v1/admin/applications",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "ids": [
                    str(self.completed_profile_id),
                    str(self.student_update_request_id),
                    str(self.teacher_update_request_id),
                ]
            },
        )
        self.assertEqual(delete_response.status_code, 200, delete_response.text)

        list_response = self.client.get(
            "/api/v1/admin/applications",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(list_response.status_code, 200, list_response.text)
        returned_ids = {item["id"] for item in list_response.json()["items"]}
        self.assertNotIn(str(self.completed_profile_id), returned_ids)
        self.assertNotIn(str(self.student_update_request_id), returned_ids)
        self.assertNotIn(str(self.teacher_update_request_id), returned_ids)
        self.assertIn(str(self.active_profile_id), returned_ids)
        self.assertIn(str(self.student_active_update_request_id), returned_ids)

    def test_unknown_id_is_handled_safely(self) -> None:
        token = self._login("admin.appdelete@example.com", "AdminAppDelete123!")

        response = self.client.request(
            "DELETE",
            "/api/v1/admin/applications",
            headers={"Authorization": f"Bearer {token}"},
            json={"ids": [str(uuid.uuid4())]},
        )

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["deleted_count"], 0)

    def test_non_admin_cannot_delete_applications(self) -> None:
        token = self._login("teacher.appdelete@example.com", "TeacherAppDelete123!")

        response = self.client.request(
            "DELETE",
            "/api/v1/admin/applications",
            headers={"Authorization": f"Bearer {token}"},
            json={"delete_all": True},
        )

        self.assertEqual(response.status_code, 403, response.text)
        self.assertEqual(response.json()["detail"], "Admin access required")


if __name__ == "__main__":
    unittest.main()
