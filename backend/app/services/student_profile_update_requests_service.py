from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.student_profile import StudentProfile
from app.models.student_profile_update_request import StudentProfileUpdateRequest
from app.schemas.student_profile_edit import StudentProfileEditRequest, StudentProfileEditResponse
from app.services.profile_gender import normalize_profile_gender
from app.services.notifications_service import create_notification, create_notifications_for_role


EDITABLE_UPDATE_REQUEST_STATUSES = {"draft", "revision_requested", "approved"}
SUBMITTABLE_UPDATE_REQUEST_STATUSES = {"draft", "revision_requested", "approved"}


def _normalize_text(value: str | None) -> str | None:
    if value is None:
        return None

    normalized_value = value.strip()
    return normalized_value or None


def _build_edit_response(
    *,
    student_profile: StudentProfile,
    update_request: StudentProfileUpdateRequest | None,
) -> StudentProfileEditResponse:
    if update_request is None:
        return StudentProfileEditResponse(
            id=None,
            student_user_id=student_profile.user_id,
            full_name=student_profile.full_name,
            birth_date=student_profile.birth_date,
            gender=student_profile.gender,
            quote=student_profile.quote,
            avatar_url=student_profile.avatar_url,
            grade_label=student_profile.grade_label,
            enrollment_date=student_profile.enrollment_date,
            status="approved",
            admin_comment=None,
            updated_at=student_profile.updated_at,
        )

    return StudentProfileEditResponse(
        id=update_request.id,
        student_user_id=student_profile.user_id,
        full_name=update_request.full_name,
        birth_date=update_request.birth_date,
        gender=update_request.gender,
        quote=update_request.quote,
        avatar_url=update_request.avatar_url,
        grade_label=student_profile.grade_label,
        enrollment_date=student_profile.enrollment_date,
        status=update_request.status,
        admin_comment=update_request.admin_comment,
        updated_at=update_request.updated_at,
    )


def _get_student_profile_or_404(db: Session, *, student_user_id: UUID) -> StudentProfile:
    profile = (
        db.query(StudentProfile)
        .filter(StudentProfile.user_id == student_user_id)
        .first()
    )
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found")

    return profile


def _get_existing_update_request(
    db: Session,
    *,
    student_user_id: UUID,
) -> StudentProfileUpdateRequest | None:
    return (
        db.query(StudentProfileUpdateRequest)
        .filter(StudentProfileUpdateRequest.student_user_id == student_user_id)
        .first()
    )


def _get_or_create_update_request(
    db: Session,
    *,
    student_profile: StudentProfile,
) -> StudentProfileUpdateRequest:
    update_request = _get_existing_update_request(db, student_user_id=student_profile.user_id)
    if update_request is not None:
        return update_request

    update_request = StudentProfileUpdateRequest(
        student_user_id=student_profile.user_id,
        full_name=student_profile.full_name,
        birth_date=student_profile.birth_date,
        gender=student_profile.gender,
        quote=student_profile.quote,
        avatar_url=student_profile.avatar_url,
        status="draft",
    )
    db.add(update_request)
    db.flush()
    return update_request


def get_student_profile_edit_state(
    db: Session,
    *,
    student_user_id: UUID,
) -> StudentProfileEditResponse:
    profile = _get_student_profile_or_404(db, student_user_id=student_user_id)
    update_request = _get_existing_update_request(db, student_user_id=student_user_id)
    return _build_edit_response(student_profile=profile, update_request=update_request)


def save_student_profile_edit_draft(
    db: Session,
    *,
    student_user_id: UUID,
    payload: StudentProfileEditRequest,
) -> StudentProfileEditResponse:
    profile = _get_student_profile_or_404(db, student_user_id=student_user_id)
    update_request = _get_or_create_update_request(db, student_profile=profile)

    if update_request.status not in EDITABLE_UPDATE_REQUEST_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Profile changes are read-only during moderation",
        )

    update_request.full_name = _normalize_text(payload.full_name)
    update_request.birth_date = payload.birth_date
    update_request.gender = normalize_profile_gender(payload.gender)
    update_request.quote = _normalize_text(payload.quote)
    update_request.avatar_url = _normalize_text(payload.avatar_url)
    update_request.status = "draft"
    update_request.admin_comment = None

    db.commit()
    db.refresh(update_request)
    return _build_edit_response(student_profile=profile, update_request=update_request)


def submit_student_profile_edit_request(
    db: Session,
    *,
    student_user_id: UUID,
) -> StudentProfileEditResponse:
    profile = _get_student_profile_or_404(db, student_user_id=student_user_id)
    update_request = _get_or_create_update_request(db, student_profile=profile)

    if update_request.status not in SUBMITTABLE_UPDATE_REQUEST_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Profile changes already submitted",
        )

    if not update_request.full_name or update_request.birth_date is None or not update_request.gender:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Required profile fields are missing",
        )

    update_request.status = "submitted"
    update_request.admin_comment = None
    update_request.updated_at = datetime.now(timezone.utc)

    create_notifications_for_role(
        db,
        role="admin",
        type="student_profile_update_submitted",
        title="Ученик отправил изменения профиля",
        message=f"Ученик {update_request.full_name} отправил изменения профиля на модерацию.",
        target_view="admin_applications",
        action_key="open_detail",
        target_id=update_request.id,
    )

    db.commit()
    db.refresh(update_request)
    return _build_edit_response(student_profile=profile, update_request=update_request)


def approve_student_profile_update_request(
    db: Session,
    *,
    student_profile: StudentProfile,
    update_request: StudentProfileUpdateRequest,
) -> StudentProfileEditResponse:
    student_profile.full_name = update_request.full_name
    student_profile.birth_date = update_request.birth_date
    student_profile.gender = update_request.gender
    student_profile.quote = update_request.quote
    student_profile.avatar_url = update_request.avatar_url
    update_request.status = "approved"
    update_request.admin_comment = None

    create_notification(
        db,
        user_id=student_profile.user_id,
        role="student",
        type="student_profile_update_approved",
        title="Изменения профиля подтверждены",
        message="Администратор подтвердил изменения профиля.",
        target_view="student_profile",
        action_key="open_tab",
    )

    db.commit()
    db.refresh(student_profile)
    db.refresh(update_request)
    return _build_edit_response(student_profile=student_profile, update_request=update_request)


def request_student_profile_update_changes(
    db: Session,
    *,
    student_profile: StudentProfile,
    update_request: StudentProfileUpdateRequest,
) -> StudentProfileEditResponse:
    update_request.status = "revision_requested"

    create_notification(
        db,
        user_id=student_profile.user_id,
        role="student",
        type="student_profile_update_revision_requested",
        title="Изменения профиля отправлены на доработку",
        message="Администратор попросил обновить изменения профиля и повторно отправить их на модерацию.",
        target_view="student_profile_edit",
        action_key="open_tab",
    )

    db.commit()
    db.refresh(update_request)
    return _build_edit_response(student_profile=student_profile, update_request=update_request)
