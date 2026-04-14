from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.teacher_profile import TeacherProfile
from app.models.teacher_profile_update_request import TeacherProfileUpdateRequest
from app.schemas.teacher_profile_edit import TeacherProfileEditRequest, TeacherProfileEditResponse
from app.services.profile_gender import normalize_profile_gender
from app.services.notifications_service import create_notification, create_notifications_for_role


EDITABLE_UPDATE_REQUEST_STATUSES = {"draft", "revision_requested", "approved"}
SUBMITTABLE_UPDATE_REQUEST_STATUSES = {"draft", "revision_requested", "approved"}


def _normalize_text(value: str | None) -> str | None:
    if value is None:
        return None

    normalized_value = value.strip()
    return normalized_value or None


def _get_teacher_profile_or_404(db: Session, *, teacher_user_id: UUID) -> TeacherProfile:
    profile = (
        db.query(TeacherProfile)
        .filter(TeacherProfile.user_id == teacher_user_id)
        .first()
    )
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher profile not found")

    return profile


def _get_existing_update_request(
    db: Session,
    *,
    teacher_user_id: UUID,
) -> TeacherProfileUpdateRequest | None:
    return (
        db.query(TeacherProfileUpdateRequest)
        .filter(TeacherProfileUpdateRequest.teacher_user_id == teacher_user_id)
        .first()
    )


def _get_or_create_update_request(
    db: Session,
    *,
    teacher_profile: TeacherProfile,
) -> TeacherProfileUpdateRequest:
    update_request = _get_existing_update_request(db, teacher_user_id=teacher_profile.user_id)
    if update_request is not None:
        return update_request

    update_request = TeacherProfileUpdateRequest(
        teacher_user_id=teacher_profile.user_id,
        full_name=teacher_profile.full_name,
        birth_date=teacher_profile.birth_date,
        gender=teacher_profile.gender,
        position=teacher_profile.position,
        phone=teacher_profile.phone,
        work_email=teacher_profile.work_email,
        subject_name=teacher_profile.subject_name,
        avatar_url=teacher_profile.avatar_url,
        status="draft",
    )
    db.add(update_request)
    db.flush()
    return update_request


def _build_edit_response(
    *,
    teacher_profile: TeacherProfile,
    update_request: TeacherProfileUpdateRequest | None,
) -> TeacherProfileEditResponse:
    if update_request is None:
        return TeacherProfileEditResponse(
            id=None,
            teacher_user_id=teacher_profile.user_id,
            full_name=teacher_profile.full_name,
            birth_date=teacher_profile.birth_date,
            gender=teacher_profile.gender,
            position=teacher_profile.position,
            phone=teacher_profile.phone,
            work_email=teacher_profile.work_email,
            subject_name=teacher_profile.subject_name,
            avatar_url=teacher_profile.avatar_url,
            status="approved",
            admin_comment=None,
            updated_at=teacher_profile.updated_at,
        )

    return TeacherProfileEditResponse(
        id=update_request.id,
        teacher_user_id=teacher_profile.user_id,
        full_name=update_request.full_name,
        birth_date=update_request.birth_date,
        gender=update_request.gender,
        position=update_request.position,
        phone=update_request.phone,
        work_email=update_request.work_email,
        subject_name=update_request.subject_name,
        avatar_url=update_request.avatar_url,
        status=update_request.status,
        admin_comment=update_request.admin_comment,
        updated_at=update_request.updated_at,
    )


def get_teacher_profile_edit_state(
    db: Session,
    *,
    teacher_user_id: UUID,
) -> TeacherProfileEditResponse:
    profile = _get_teacher_profile_or_404(db, teacher_user_id=teacher_user_id)
    update_request = _get_existing_update_request(db, teacher_user_id=teacher_user_id)
    return _build_edit_response(teacher_profile=profile, update_request=update_request)


def save_teacher_profile_edit_draft(
    db: Session,
    *,
    teacher_user_id: UUID,
    payload: TeacherProfileEditRequest,
) -> TeacherProfileEditResponse:
    profile = _get_teacher_profile_or_404(db, teacher_user_id=teacher_user_id)
    update_request = _get_or_create_update_request(db, teacher_profile=profile)

    if update_request.status not in EDITABLE_UPDATE_REQUEST_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Profile changes are read-only during moderation",
        )

    update_request.full_name = _normalize_text(payload.full_name)
    update_request.birth_date = payload.birth_date
    update_request.gender = normalize_profile_gender(payload.gender)
    update_request.position = _normalize_text(payload.position)
    update_request.phone = _normalize_text(payload.phone)
    update_request.work_email = _normalize_text(payload.work_email)
    update_request.subject_name = _normalize_text(payload.subject_name)
    update_request.avatar_url = _normalize_text(payload.avatar_url)
    update_request.status = "draft"
    update_request.admin_comment = None

    db.commit()
    db.refresh(update_request)
    return _build_edit_response(teacher_profile=profile, update_request=update_request)


def submit_teacher_profile_edit_request(
    db: Session,
    *,
    teacher_user_id: UUID,
) -> TeacherProfileEditResponse:
    profile = _get_teacher_profile_or_404(db, teacher_user_id=teacher_user_id)
    update_request = _get_or_create_update_request(db, teacher_profile=profile)

    if update_request.status not in SUBMITTABLE_UPDATE_REQUEST_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Profile changes already submitted",
        )

    if (
        not update_request.full_name
        or update_request.birth_date is None
        or not update_request.gender
        or not update_request.position
        or not update_request.phone
        or not update_request.work_email
        or not update_request.subject_name
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Required profile fields are missing",
        )

    update_request.status = "submitted"
    update_request.admin_comment = None
    update_request.updated_at = datetime.now(timezone.utc)

    create_notification(
        db,
        user_id=profile.user_id,
        role="teacher",
        type="teacher_profile_update_submitted",
        title="Изменения профиля отправлены на модерацию",
        message="Изменения профиля преподавателя отправлены администратору на проверку.",
        target_view="teacher_profile_edit",
        action_key="open_tab",
        target_id=update_request.id,
    )
    create_notifications_for_role(
        db,
        role="admin",
        type="teacher_profile_update_submitted",
        title="Преподаватель обновил профиль",
        message=f"Преподаватель {update_request.full_name} отправил изменения профиля на модерацию.",
        target_view="admin_applications",
        action_key="open_detail",
        target_id=update_request.id,
    )

    db.commit()
    db.refresh(update_request)
    return _build_edit_response(teacher_profile=profile, update_request=update_request)


def approve_teacher_profile_update_request(
    db: Session,
    *,
    teacher_profile: TeacherProfile,
    update_request: TeacherProfileUpdateRequest,
) -> TeacherProfileEditResponse:
    teacher_profile.full_name = update_request.full_name
    teacher_profile.birth_date = update_request.birth_date
    teacher_profile.gender = update_request.gender
    teacher_profile.position = update_request.position
    teacher_profile.phone = update_request.phone
    teacher_profile.work_email = update_request.work_email
    teacher_profile.subject_name = update_request.subject_name
    teacher_profile.avatar_url = update_request.avatar_url
    update_request.status = "approved"
    update_request.admin_comment = None

    create_notification(
        db,
        user_id=teacher_profile.user_id,
        role="teacher",
        type="teacher_profile_update_approved",
        title="Изменения профиля подтверждены",
        message="Администратор подтвердил изменения профиля преподавателя.",
        target_view="teacher_profile",
        action_key="open_tab",
    )

    db.commit()
    db.refresh(teacher_profile)
    db.refresh(update_request)
    return _build_edit_response(teacher_profile=teacher_profile, update_request=update_request)


def request_teacher_profile_update_changes(
    db: Session,
    *,
    teacher_profile: TeacherProfile,
    update_request: TeacherProfileUpdateRequest,
) -> TeacherProfileEditResponse:
    update_request.status = "revision_requested"

    create_notification(
        db,
        user_id=teacher_profile.user_id,
        role="teacher",
        type="teacher_profile_update_revision_requested",
        title="Изменения профиля отправлены на доработку",
        message="Администратор попросил обновить изменения профиля и повторно отправить их на модерацию.",
        target_view="teacher_profile_edit",
        action_key="open_tab",
        target_id=update_request.id,
    )

    db.commit()
    db.refresh(update_request)
    return _build_edit_response(teacher_profile=teacher_profile, update_request=update_request)
