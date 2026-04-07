from uuid import UUID

from sqlalchemy.orm import Session

from app.models.student_profile import StudentProfile
from app.models.teacher_student import TeacherStudent
from app.schemas.teacher_students import TeacherStudentDetail, TeacherStudentListItem


def list_teacher_students(db: Session, teacher_user_id: UUID) -> list[TeacherStudentListItem]:
    profiles = (
        db.query(StudentProfile)
        .join(TeacherStudent, TeacherStudent.student_user_id == StudentProfile.user_id)
        .filter(TeacherStudent.teacher_user_id == teacher_user_id)
        .order_by(StudentProfile.full_name.asc())
        .all()
    )

    return [
        TeacherStudentListItem(
            id=profile.user_id,
            full_name=profile.full_name,
            grade_label=profile.grade_label,
            avatar_url=profile.avatar_url,
        )
        for profile in profiles
    ]


def get_teacher_student(
    db: Session, teacher_user_id: UUID, student_user_id: UUID
) -> TeacherStudentDetail | None:
    profile = (
        db.query(StudentProfile)
        .join(TeacherStudent, TeacherStudent.student_user_id == StudentProfile.user_id)
        .filter(
            TeacherStudent.teacher_user_id == teacher_user_id,
            StudentProfile.user_id == student_user_id,
        )
        .first()
    )

    if profile is None:
        return None

    return TeacherStudentDetail(
        id=profile.user_id,
        full_name=profile.full_name,
        birth_date=profile.birth_date,
        gender=profile.gender,
        grade_label=profile.grade_label,
        enrollment_date=profile.enrollment_date,
        quote=profile.quote,
        avatar_url=profile.avatar_url,
    )
