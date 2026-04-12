from uuid import UUID

from sqlalchemy.orm import Session

from app.models.teacher_profile import TeacherProfile
from app.schemas.teacher_profile import TeacherProfileResponse


def get_teacher_profile(db: Session, teacher_user_id: UUID) -> TeacherProfileResponse | None:
    profile = db.query(TeacherProfile).filter(TeacherProfile.user_id == teacher_user_id).first()

    if profile is None:
        return None

    return TeacherProfileResponse(
        id=profile.id,
        user_id=profile.user_id,
        full_name=profile.full_name,
        birth_date=profile.birth_date,
        gender=profile.gender,
        position=profile.position,
        phone=profile.phone,
        work_email=profile.work_email,
        subject_name=profile.subject_name,
        avatar_url=profile.avatar_url,
    )
