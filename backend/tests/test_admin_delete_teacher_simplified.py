import unittest
import uuid
from collections.abc import Iterator
from datetime import date

from fastapi.testclient import TestClient
from sqlalchemy import event
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.dependencies import get_db
from app.main import app
from app.models.learning_material import LearningMaterial
from app.models.student_learning_material import StudentLearningMaterial
from app.models.student_profile import StudentProfile
from app.models.student_teacher_removal_request import StudentTeacherRemovalRequest
from app.models.teacher_profile import TeacherProfile
from app.models.teacher_student import TeacherStudent
from app.models.user import User
from app.services.auth_service import get_password_hash


class AdminDeleteTeacherSimplifiedTests(unittest.TestCase):
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
            db.query(StudentTeacherRemovalRequest).delete()
            db.query(TeacherStudent).delete()
            db.query(StudentProfile).delete()
            db.query(TeacherProfile).delete()
            db.query(User).delete()
            db.commit()

            self.admin_id = uuid.uuid4()
            self.teacher_id = uuid.uuid4()
            self.other_teacher_id = uuid.uuid4()
            self.student_assigned_id = uuid.uuid4()
            self.student_assigned_second_id = uuid.uuid4()
            self.student_unassigned_id = uuid.uuid4()
            self.non_teacher_user_id = uuid.uuid4()
            self.material_id = uuid.uuid4()
            self.student_material_id = uuid.uuid4()

            db.add_all(
                [
                    User(
                        id=self.admin_id,
                        email="admin.delete.teacher@example.com",
                        password_hash=get_password_hash("AdminDeleteTeacher123!"),
                        role="admin",
                        is_active=True,
                    ),
                    User(
                        id=self.teacher_id,
                        email="teacher.delete.teacher@example.com",
                        password_hash=get_password_hash("TeacherDeleteTeacher123!"),
                        role="teacher",
                        is_active=True,
                    ),
                    User(
                        id=self.other_teacher_id,
                        email="teacher.other.delete.teacher@example.com",
                        password_hash=get_password_hash("OtherTeacherDeleteTeacher123!"),
                        role="teacher",
                        is_active=True,
                    ),
                    User(
                        id=self.student_assigned_id,
                        email="student.assigned.delete.teacher@example.com",
                        password_hash=get_password_hash("StudentAssignedDeleteTeacher123!"),
                        role="student",
                        is_active=True,
                    ),
                    User(
                        id=self.student_assigned_second_id,
                        email="student.assigned.second.delete.teacher@example.com",
                        password_hash=get_password_hash("StudentAssignedSecondDeleteTeacher123!"),
                        role="student",
                        is_active=True,
                    ),
                    User(
                        id=self.student_unassigned_id,
                        email="student.unassigned.delete.teacher@example.com",
                        password_hash=get_password_hash("StudentUnassignedDeleteTeacher123!"),
                        role="student",
                        is_active=True,
                    ),
                    User(
                        id=self.non_teacher_user_id,
                        email="user.delete.teacher@example.com",
                        password_hash=get_password_hash("UserDeleteTeacher123!"),
                        role="student",
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
                        work_email="teacher.delete.teacher@example.com",
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
                        work_email="teacher.other.delete.teacher@example.com",
                        subject_name="Русский язык",
                    ),
                ]
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
                        quote="Первый назначенный ученик",
                        profile_status="teacher_accepted",
                        current_teacher_user_id=self.teacher_id,
                        teacher_review_status="accepted",
                    ),
                    StudentProfile(
                        id=uuid.uuid4(),
                        user_id=self.student_assigned_second_id,
                        full_name="Петров Артём Сергеевич",
                        birth_date=date(2011, 3, 11),
                        gender="Мужской",
                        grade_label="5Б класс",
                        enrollment_date=date(2018, 9, 3),
                        quote="Второй назначенный ученик",
                        profile_status="teacher_accepted",
                        current_teacher_user_id=self.teacher_id,
                        teacher_review_status="accepted",
                    ),
                    StudentProfile(
                        id=uuid.uuid4(),
                        user_id=self.student_unassigned_id,
                        full_name="Смирнова Анна Ильинична",
                        birth_date=date(2012, 5, 19),
                        gender="Женский",
                        grade_label="3В класс",
                        enrollment_date=date(2019, 9, 2),
                        quote="Уже в waiting pool",
                        profile_status="approved",
                        current_teacher_user_id=None,
                        teacher_review_status=None,
                    ),
                ]
            )

            db.add_all(
                [
                    TeacherStudent(
                        id=uuid.uuid4(),
                        teacher_user_id=self.teacher_id,
                        student_user_id=self.student_assigned_id,
                    ),
                    TeacherStudent(
                        id=uuid.uuid4(),
                        teacher_user_id=self.teacher_id,
                        student_user_id=self.student_assigned_second_id,
                    ),
                ]
            )

            db.add(
                StudentTeacherRemovalRequest(
                    id=uuid.uuid4(),
                    teacher_user_id=self.teacher_id,
                    student_user_id=self.student_assigned_id,
                    status="pending",
                    reason="Проверка автозакрытия",
                )
            )

            db.add(
                LearningMaterial(
                    id=self.material_id,
                    teacher_user_id=self.teacher_id,
                    title="Материал удаляемого преподавателя",
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
                    id=self.student_material_id,
                    student_user_id=self.student_assigned_id,
                    learning_material_id=self.material_id,
                    assigned_by_teacher_user_id=self.teacher_id,
                    assigned_title="Снэпшот материала",
                    assigned_text="Снэпшот адаптированного текста",
                    assigned_adaptation_mode="basic_simplify",
                    assigned_is_adapted=True,
                )
            )
            db.commit()

    def _login(self, email: str, password: str) -> str:
        response = self.client.post("/api/v1/auth/login", json={"email": email, "password": password})
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()["access_token"]

    def test_admin_can_delete_teacher_with_students(self) -> None:
        token = self._login("admin.delete.teacher@example.com", "AdminDeleteTeacher123!")

        response = self.client.delete(
            f"/api/v1/admin/teachers/{self.teacher_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertEqual(payload["detail"], "Teacher deleted")
        self.assertEqual(payload["teacher_user_id"], str(self.teacher_id))
        self.assertEqual(payload["released_students_count"], 2)

        with self.SessionLocal() as db:
            teacher_user = db.query(User).filter(User.id == self.teacher_id).first()
            self.assertIsNotNone(teacher_user)
            self.assertFalse(teacher_user.is_active)

            relations = db.query(TeacherStudent).filter(TeacherStudent.teacher_user_id == self.teacher_id).all()
            self.assertEqual(relations, [])

            released_profiles = (
                db.query(StudentProfile)
                .filter(StudentProfile.user_id.in_([self.student_assigned_id, self.student_assigned_second_id]))
                .all()
            )
            self.assertEqual(len(released_profiles), 2)
            for profile in released_profiles:
                self.assertEqual(profile.profile_status, "approved")
                self.assertIsNone(profile.current_teacher_user_id)
                self.assertIsNone(profile.teacher_review_status)

    def test_admin_can_delete_teacher_without_students(self) -> None:
        token = self._login("admin.delete.teacher@example.com", "AdminDeleteTeacher123!")

        with self.SessionLocal() as db:
            db.query(TeacherStudent).filter(TeacherStudent.teacher_user_id == self.other_teacher_id).delete()
            db.commit()

        response = self.client.delete(
            f"/api/v1/admin/teachers/{self.other_teacher_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["released_students_count"], 0)

    def test_released_students_appear_in_unassigned_list(self) -> None:
        token = self._login("admin.delete.teacher@example.com", "AdminDeleteTeacher123!")

        delete_response = self.client.delete(
            f"/api/v1/admin/teachers/{self.teacher_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(delete_response.status_code, 200, delete_response.text)

        unassigned_response = self.client.get(
            "/api/v1/admin/students/unassigned",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(unassigned_response.status_code, 200, unassigned_response.text)
        returned_user_ids = {item["user_id"] for item in unassigned_response.json()["items"]}
        self.assertIn(str(self.student_assigned_id), returned_user_ids)
        self.assertIn(str(self.student_assigned_second_id), returned_user_ids)
        self.assertIn(str(self.student_unassigned_id), returned_user_ids)

    def test_deleted_teacher_not_in_assignment_options_or_active_teacher_list(self) -> None:
        token = self._login("admin.delete.teacher@example.com", "AdminDeleteTeacher123!")

        delete_response = self.client.delete(
            f"/api/v1/admin/teachers/{self.teacher_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(delete_response.status_code, 200, delete_response.text)

        assignment_response = self.client.get(
            "/api/v1/admin/teachers/assignment-options",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(assignment_response.status_code, 200, assignment_response.text)
        assignment_teacher_ids = {
            item["teacher_user_id"] for item in assignment_response.json()["items"]
        }
        self.assertNotIn(str(self.teacher_id), assignment_teacher_ids)
        self.assertIn(str(self.other_teacher_id), assignment_teacher_ids)

        list_response = self.client.get(
            "/api/v1/admin/teachers",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(list_response.status_code, 200, list_response.text)
        list_teacher_ids = {item["id"] for item in list_response.json()["items"]}
        self.assertNotIn(str(self.teacher_id), list_teacher_ids)
        self.assertIn(str(self.other_teacher_id), list_teacher_ids)

        detail_response = self.client.get(
            f"/api/v1/admin/teachers/{self.teacher_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(detail_response.status_code, 404, detail_response.text)

    def test_non_admin_cannot_delete_teacher(self) -> None:
        teacher_token = self._login("teacher.delete.teacher@example.com", "TeacherDeleteTeacher123!")

        response = self.client.delete(
            f"/api/v1/admin/teachers/{self.other_teacher_id}",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )

        self.assertEqual(response.status_code, 403, response.text)
        self.assertEqual(response.json()["detail"], "Admin access required")

    def test_cannot_delete_non_teacher_user(self) -> None:
        token = self._login("admin.delete.teacher@example.com", "AdminDeleteTeacher123!")

        response = self.client.delete(
            f"/api/v1/admin/teachers/{self.non_teacher_user_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        self.assertEqual(response.status_code, 404, response.text)
        self.assertEqual(response.json()["detail"], "Teacher not found")

    def test_student_material_snapshots_remain_after_teacher_delete(self) -> None:
        token = self._login("admin.delete.teacher@example.com", "AdminDeleteTeacher123!")

        response = self.client.delete(
            f"/api/v1/admin/teachers/{self.teacher_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(response.status_code, 200, response.text)

        with self.SessionLocal() as db:
            live_material = db.query(LearningMaterial).filter(LearningMaterial.id == self.material_id).first()
            snapshot = (
                db.query(StudentLearningMaterial)
                .filter(StudentLearningMaterial.id == self.student_material_id)
                .first()
            )
            self.assertIsNotNone(live_material)
            self.assertIsNotNone(snapshot)
            self.assertEqual(snapshot.assigned_title, "Снэпшот материала")
            self.assertEqual(snapshot.assigned_text, "Снэпшот адаптированного текста")

    def test_pending_removal_requests_are_closed_when_teacher_is_deleted(self) -> None:
        token = self._login("admin.delete.teacher@example.com", "AdminDeleteTeacher123!")

        response = self.client.delete(
            f"/api/v1/admin/teachers/{self.teacher_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(response.status_code, 200, response.text)

        with self.SessionLocal() as db:
            request = (
                db.query(StudentTeacherRemovalRequest)
                .filter(StudentTeacherRemovalRequest.teacher_user_id == self.teacher_id)
                .first()
            )
            self.assertIsNotNone(request)
            self.assertEqual(request.status, "approved")
            self.assertIsNotNone(request.resolved_at)


if __name__ == "__main__":
    unittest.main()
