from datetime import date
import uuid

from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.student_profile import StudentProfile
from app.models.teacher_profile import TeacherProfile
from app.models.teacher_student import TeacherStudent
from app.models.user import User
from app.services.auth_service import get_password_hash, normalize_email


TEACHER_EMAIL = "teacher.seed@example.com"
TEACHER_PASSWORD = "TeacherSeed123!"
STUDENT_EMAIL = "student.seed@example.com"
STUDENT_PASSWORD = "StudentSeed123!"


def get_or_create_user(db: Session, *, email: str, password: str, role: str) -> User:
    normalized_email = normalize_email(email)
    existing_user = db.query(User).filter(User.email == normalized_email).first()

    if existing_user:
        existing_user.password_hash = get_password_hash(password)
        existing_user.role = role
        existing_user.is_active = True
        db.commit()
        db.refresh(existing_user)
        return existing_user

    user = User(
        id=uuid.uuid4(),
        email=normalized_email,
        password_hash=get_password_hash(password),
        role=role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def ensure_teacher_profile(db: Session, teacher_user: User) -> None:
    profile = db.query(TeacherProfile).filter(TeacherProfile.user_id == teacher_user.id).first()
    if profile:
        profile.full_name = "Попов Михаил Петрович"
        profile.birth_date = date(1985, 11, 17)
        profile.gender = "Мужской"
        profile.position = "Преподаватель"
        profile.phone = "+79205224112"
        profile.work_email = "popov2178@bmstu.ru"
        profile.subject_name = "Литература"
        profile.avatar_url = None
        db.commit()
        return

    db.add(
        TeacherProfile(
            id=uuid.uuid4(),
            user_id=teacher_user.id,
            full_name="Попов Михаил Петрович",
            birth_date=date(1985, 11, 17),
            gender="Мужской",
            position="Преподаватель",
            phone="+79205224112",
            work_email="popov2178@bmstu.ru",
            subject_name="Литература",
            avatar_url=None,
        )
    )
    db.commit()


def ensure_student_profile(db: Session, student_user: User) -> None:
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == student_user.id).first()
    if profile:
        profile.full_name = "Иванов Андрей Викторович"
        profile.birth_date = date(2010, 1, 23)
        profile.gender = "Мужской"
        profile.grade_label = "4А класс"
        profile.enrollment_date = date(2017, 9, 3)
        profile.quote = "Маленький человек может сделать гораздо больше, чем он об этом предполагает"
        profile.avatar_url = None
        profile.profile_status = "draft"
        profile.submitted_at = None
        db.commit()
        return

    db.add(
        StudentProfile(
            id=uuid.uuid4(),
            user_id=student_user.id,
            full_name="Иванов Андрей Викторович",
            birth_date=date(2010, 1, 23),
            gender="Мужской",
            grade_label="4А класс",
            enrollment_date=date(2017, 9, 3),
            quote="Маленький человек может сделать гораздо больше, чем он об этом предполагает",
            avatar_url=None,
            profile_status="draft",
            submitted_at=None,
        )
    )
    db.commit()


def ensure_teacher_student_link(db: Session, teacher_user: User, student_user: User) -> None:
    link = (
        db.query(TeacherStudent)
        .filter(
            TeacherStudent.teacher_user_id == teacher_user.id,
            TeacherStudent.student_user_id == student_user.id,
        )
        .first()
    )
    if link:
        return

    db.add(
        TeacherStudent(
            id=uuid.uuid4(),
            teacher_user_id=teacher_user.id,
            student_user_id=student_user.id,
        )
    )
    db.commit()


def seed() -> None:
    db = SessionLocal()
    try:
        teacher_user = get_or_create_user(
            db, email=TEACHER_EMAIL, password=TEACHER_PASSWORD, role="teacher"
        )
        student_user = get_or_create_user(
            db, email=STUDENT_EMAIL, password=STUDENT_PASSWORD, role="student"
        )

        ensure_teacher_profile(db, teacher_user)
        ensure_student_profile(db, student_user)
        ensure_teacher_student_link(db, teacher_user, student_user)

        print(f"Teacher seed user: {TEACHER_EMAIL}")
        print(f"Student seed user: {STUDENT_EMAIL}")
        print("Seed completed successfully")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
