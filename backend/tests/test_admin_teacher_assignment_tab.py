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
from app.models.teacher_profile import TeacherProfile
from app.models.teacher_student import TeacherStudent
from app.models.teacher_student_rejection import TeacherStudentRejection
from app.models.user import User
from app.services.auth_service import get_password_hash


class AdminTeacherAssignmentTabTests(unittest.TestCase):
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
        TeacherStudentRejection.__table__.create(bind=cls.engine, checkfirst=True)
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
            db.query(TeacherStudentRejection).delete()
            db.query(TeacherStudent).delete()
            db.query(StudentProfile).delete()
            db.query(TeacherProfile).delete()
            db.query(User).delete()
            db.commit()

            self.admin_id = uuid.uuid4()
            self.teacher_id = uuid.uuid4()
            self.student_assigned_id = uuid.uuid4()
            self.student_unassigned_id = uuid.uuid4()
            self.student_submitted_id = uuid.uuid4()
            self.unassigned_application_id = uuid.uuid4()
            self.submitted_application_id = uuid.uuid4()

            db.add_all(
                [
                    User(
                        id=self.admin_id,
                        email="admin.assignmenttab@example.com",
                        password_hash=get_password_hash("AdminAssignmentTab123!"),
                        role="admin",
                        is_active=True,
                    ),
                    User(
                        id=self.teacher_id,
                        email="teacher.assignmenttab@example.com",
                        password_hash=get_password_hash("TeacherAssignmentTab123!"),
                        role="teacher",
                        is_active=True,
                    ),
                    User(
                        id=self.student_assigned_id,
                        email="student.assigned.assignmenttab@example.com",
                        password_hash=get_password_hash("StudentAssignedAssignmentTab123!"),
                        role="student",
                        is_active=True,
                    ),
                    User(
                        id=self.student_unassigned_id,
                        email="student.unassigned.assignmenttab@example.com",
                        password_hash=get_password_hash("StudentUnassignedAssignmentTab123!"),
                        role="student",
                        is_active=True,
                    ),
                    User(
                        id=self.student_submitted_id,
                        email="student.submitted.assignmenttab@example.com",
                        password_hash=get_password_hash("StudentSubmittedAssignmentTab123!"),
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
                    work_email="teacher.assignmenttab@example.com",
                    subject_name="Литература",
                )
            )

            db.add_all(
                [
                    StudentProfile(
                        id=uuid.uuid4(),
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
                    StudentProfile(
                        id=self.submitted_application_id,
                        user_id=self.student_submitted_id,
                        full_name="Смирнова Анна Ильинична",
                        birth_date=date(2012, 5, 19),
                        gender="Женский",
                        grade_label="3В класс",
                        enrollment_date=date(2019, 9, 2),
                        quote="Ученик в существующем flow",
                        profile_status="submitted",
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
            db.commit()

    def _login(self, email: str, password: str) -> str:
        response = self.client.post("/api/v1/auth/login", json={"email": email, "password": password})
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()["access_token"]

    def test_admin_can_create_teacher(self) -> None:
        token = self._login("admin.assignmenttab@example.com", "AdminAssignmentTab123!")

        response = self.client.post(
            "/api/v1/admin/teachers",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "email": "new.teacher.assignmenttab@example.com",
                "password": "NewTeacherAssignmentTab123!",
                "first_name": "Ирина",
                "last_name": "Соколова",
                "birth_date": "1989-04-12",
                "gender": "female",
                "position": "Учитель-логопед",
                "phone": "+79001234567",
                "subject_name": "Русский язык",
            },
        )

        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertEqual(payload["full_name"], "Соколова Ирина")
        self.assertEqual(payload["email"], "new.teacher.assignmenttab@example.com")
        self.assertEqual(payload["current_students_count"], 0)
        self.assertEqual(payload["capacity_limit"], 15)
        self.assertEqual(payload["available_slots"], 15)

        with self.SessionLocal() as db:
            user = db.query(User).filter(User.email == "new.teacher.assignmenttab@example.com").first()
            self.assertIsNotNone(user)
            self.assertEqual(user.role, "teacher")
            profile = db.query(TeacherProfile).filter(TeacherProfile.user_id == user.id).first()
            self.assertIsNotNone(profile)
            self.assertEqual(profile.full_name, "Соколова Ирина")
            self.assertEqual(str(profile.birth_date), "1989-04-12")
            self.assertEqual(profile.gender, "female")
            self.assertEqual(profile.position, "Учитель-логопед")
            self.assertEqual(profile.phone, "+79001234567")
            self.assertEqual(profile.work_email, "new.teacher.assignmenttab@example.com")
            self.assertEqual(profile.subject_name, "Русский язык")

    def test_teacher_detail_returns_email_from_user_and_gender_codes_are_saved(self) -> None:
        token = self._login("admin.assignmenttab@example.com", "AdminAssignmentTab123!")

        create_response = self.client.post(
            "/api/v1/admin/teachers",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "email": "detail.teacher.assignmenttab@example.com",
                "password": "DetailTeacherAssignmentTab123!",
                "first_name": "Мария",
                "last_name": "Павлова",
                "gender": "not_specified",
            },
        )
        self.assertEqual(create_response.status_code, 200, create_response.text)
        teacher_id = create_response.json()["id"]

        detail_response = self.client.get(
            f"/api/v1/admin/teachers/{teacher_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(detail_response.status_code, 200, detail_response.text)
        detail_payload = detail_response.json()
        self.assertEqual(detail_payload["email"], "detail.teacher.assignmenttab@example.com")
        self.assertEqual(detail_payload["gender"], "not_specified")

    def test_teacher_gender_codes_are_saved_for_all_supported_values(self) -> None:
        token = self._login("admin.assignmenttab@example.com", "AdminAssignmentTab123!")

        test_cases = [
            ("gender.ns.assignmenttab@example.com", "not_specified"),
            ("gender.m.assignmenttab@example.com", "male"),
            ("gender.f.assignmenttab@example.com", "female"),
        ]

        for index, (email, gender) in enumerate(test_cases):
            response = self.client.post(
                "/api/v1/admin/teachers",
                headers={"Authorization": f"Bearer {token}"},
                json={
                    "email": email,
                    "password": f"GenderTeacher{index}123!",
                    "first_name": "Тест",
                    "last_name": f"Гендер{index}",
                    "gender": gender,
                },
            )
            self.assertEqual(response.status_code, 200, response.text)

        with self.SessionLocal() as db:
            for email, gender in test_cases:
                user = db.query(User).filter(User.email == email).first()
                self.assertIsNotNone(user)
                profile = db.query(TeacherProfile).filter(TeacherProfile.user_id == user.id).first()
                self.assertIsNotNone(profile)
                self.assertEqual(profile.gender, gender)

    def test_duplicate_email_is_rejected(self) -> None:
        token = self._login("admin.assignmenttab@example.com", "AdminAssignmentTab123!")

        response = self.client.post(
            "/api/v1/admin/teachers",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "email": "teacher.assignmenttab@example.com",
                "password": "TeacherAssignmentTab123!",
                "first_name": "Михаил",
                "last_name": "Попов",
            },
        )

        self.assertEqual(response.status_code, 400, response.text)
        self.assertEqual(response.json()["detail"], "Email already registered")

    def test_non_admin_cannot_create_teacher(self) -> None:
        teacher_token = self._login("teacher.assignmenttab@example.com", "TeacherAssignmentTab123!")

        response = self.client.post(
            "/api/v1/admin/teachers",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={
                "email": "blocked.teacher.assignmenttab@example.com",
                "password": "BlockedTeacherAssignmentTab123!",
                "first_name": "Иван",
                "last_name": "Петров",
            },
        )

        self.assertEqual(response.status_code, 403, response.text)
        self.assertEqual(response.json()["detail"], "Admin access required")

    def test_admin_can_list_unassigned_students(self) -> None:
        token = self._login("admin.assignmenttab@example.com", "AdminAssignmentTab123!")

        response = self.client.get(
            "/api/v1/admin/students/unassigned",
            headers={"Authorization": f"Bearer {token}"},
        )

        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        returned_ids = {item["application_id"] for item in payload["items"]}
        self.assertIn(str(self.unassigned_application_id), returned_ids)
        self.assertIn(str(self.submitted_application_id), returned_ids)

    def test_admin_can_list_teachers_with_capacity_info(self) -> None:
        token = self._login("admin.assignmenttab@example.com", "AdminAssignmentTab123!")

        response = self.client.get(
            "/api/v1/admin/teachers/assignment-options",
            headers={"Authorization": f"Bearer {token}"},
        )

        self.assertEqual(response.status_code, 200, response.text)
        item = response.json()["items"][0]
        self.assertEqual(item["teacher_user_id"], str(self.teacher_id))
        self.assertEqual(item["student_count"], 1)
        self.assertEqual(item["capacity"], 15)
        self.assertTrue(item["is_available"])

    def test_admin_can_assign_unassigned_student_to_teacher(self) -> None:
        token = self._login("admin.assignmenttab@example.com", "AdminAssignmentTab123!")

        response = self.client.post(
            f"/api/v1/admin/applications/{self.unassigned_application_id}/assign-teacher",
            headers={"Authorization": f"Bearer {token}"},
            json={"teacher_user_id": str(self.teacher_id)},
        )

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["current_teacher_user_id"], str(self.teacher_id))

        with self.SessionLocal() as db:
            assignment = (
                db.query(TeacherStudent)
                .filter(
                    TeacherStudent.teacher_user_id == self.teacher_id,
                    TeacherStudent.student_user_id == self.student_unassigned_id,
                )
                .first()
            )
            self.assertIsNotNone(assignment)

    def test_cannot_assign_student_to_teacher_over_capacity(self) -> None:
        token = self._login("admin.assignmenttab@example.com", "AdminAssignmentTab123!")

        with self.SessionLocal() as db:
            for index in range(14):
                extra_student_id = uuid.uuid4()
                db.add(
                    User(
                        id=extra_student_id,
                        email=f"extra.capacity.{index}@example.com",
                        password_hash=get_password_hash("ExtraCapacity123!"),
                        role="student",
                        is_active=True,
                    )
                )
                db.add(
                    TeacherStudent(
                        id=uuid.uuid4(),
                        teacher_user_id=self.teacher_id,
                        student_user_id=extra_student_id,
                    )
                )
            db.commit()

        response = self.client.post(
            f"/api/v1/admin/applications/{self.unassigned_application_id}/assign-teacher",
            headers={"Authorization": f"Bearer {token}"},
            json={"teacher_user_id": str(self.teacher_id)},
        )

        self.assertEqual(response.status_code, 409, response.text)
        self.assertEqual(response.json()["detail"], "Teacher is at full capacity")

    def test_assigned_student_disappears_from_unassigned_list(self) -> None:
        token = self._login("admin.assignmenttab@example.com", "AdminAssignmentTab123!")

        assign_response = self.client.post(
            f"/api/v1/admin/applications/{self.unassigned_application_id}/assign-teacher",
            headers={"Authorization": f"Bearer {token}"},
            json={"teacher_user_id": str(self.teacher_id)},
        )
        self.assertEqual(assign_response.status_code, 200, assign_response.text)

        list_response = self.client.get(
            "/api/v1/admin/students/unassigned",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(list_response.status_code, 200, list_response.text)
        returned_ids = {item["application_id"] for item in list_response.json()["items"]}
        self.assertNotIn(str(self.unassigned_application_id), returned_ids)

    def test_existing_assignment_flow_still_works(self) -> None:
        token = self._login("admin.assignmenttab@example.com", "AdminAssignmentTab123!")

        response = self.client.post(
            f"/api/v1/admin/applications/{self.submitted_application_id}/assign-teacher",
            headers={"Authorization": f"Bearer {token}"},
            json={"teacher_user_id": str(self.teacher_id)},
        )

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["current_teacher_user_id"], str(self.teacher_id))


if __name__ == "__main__":
    unittest.main()
