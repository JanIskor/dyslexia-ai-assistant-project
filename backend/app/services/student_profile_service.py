from datetime import datetime, timezone
import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.student_profile import StudentProfile
from app.models.teacher_student import TeacherStudent
from app.services.notifications_service import create_notifications_for_role


EDITABLE_PROFILE_STATUSES = {"draft", "needs_completion"}
SUBMITTABLE_PROFILE_STATUSES = {"draft", "needs_completion"}


def _normalize_text(value: str | None) -> str | None:
    if value is None:
        return None

    normalized_value = value.strip()
    return normalized_value or None


def get_or_create_student_profile(db: Session, student_user_id) -> StudentProfile:
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == student_user_id).first()
    if profile is not None:
        return profile

    profile = StudentProfile(
        id=uuid.uuid4(),
        user_id=student_user_id,
        profile_status="draft",
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


def get_student_mode(db: Session, *, student_user_id) -> str:
    has_assigned_teacher = (
        db.query(TeacherStudent)
        .filter(TeacherStudent.student_user_id == student_user_id)
        .first()
        is not None
    )
    return "regular" if has_assigned_teacher else "onboarding"


def update_student_profile(
    db: Session,
    *,
    profile: StudentProfile,
    updates: dict,
) -> StudentProfile:
    if profile.profile_status not in EDITABLE_PROFILE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Profile is read-only during moderation",
        )

    if "full_name" in updates:
        profile.full_name = _normalize_text(updates["full_name"])
    if "birth_date" in updates:
        profile.birth_date = updates["birth_date"]
    if "gender" in updates:
        profile.gender = _normalize_text(updates["gender"])
    if "quote" in updates:
        profile.quote = _normalize_text(updates["quote"])

    db.commit()
    db.refresh(profile)
    return profile


def submit_student_profile(db: Session, *, profile: StudentProfile) -> StudentProfile:
    previous_status = profile.profile_status

    if profile.profile_status not in SUBMITTABLE_PROFILE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Profile already submitted",
        )

    if not profile.full_name or profile.birth_date is None or not profile.gender:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Required profile fields are missing",
        )

    profile.profile_status = "submitted"
    profile.submitted_at = datetime.now(timezone.utc)

    if previous_status == "needs_completion":
        create_notifications_for_role(
            db,
            role="admin",
            type="student_resubmitted_profile",
            title="Ученик повторно отправил профиль",
            message=f"Ученик {profile.full_name} повторно отправил профиль после доработки.",
            target_view="admin_applications",
            action_key="open_detail",
            target_id=profile.id,
        )
    else:
        create_notifications_for_role(
            db,
            role="admin",
            type="student_first_submitted_profile",
            title="Новая заявка ученика",
            message=f"Ученик {profile.full_name} впервые отправил профиль на модерацию.",
            target_view="admin_applications",
            action_key="open_detail",
            target_id=profile.id,
        )

    db.commit()
    db.refresh(profile)
    return profile
