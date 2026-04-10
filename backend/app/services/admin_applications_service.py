from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.student_profile import StudentProfile
from app.models.user import User
from app.schemas.admin_applications import (
    AdminApplicationDetailResponse,
    AdminApplicationListItem,
    AdminApplicationsFiltersResponse,
    AdminApplicationStatusFilterOption,
    AdminApplicationsListResponse,
    AdminApplicationUpdateRequest,
)


PROFILE_STATUS_TO_APPLICATION_STATUS = {
    "submitted": "Новая",
    "in_review": "На рассмотрении",
    "needs_completion": "На доработке",
    "approved": "Подтверждена",
    "draft": "Черновик",
    "rejected": "Отклонена",
}

APPLICATION_STATUS_TO_PROFILE_STATUSES = {
    "Новая": ("submitted",),
    "На рассмотрении": ("in_review",),
    "На доработке": ("needs_completion",),
    "Подтверждена": ("approved",),
}

VISIBLE_APPLICATION_STATUSES = ("submitted", "in_review", "needs_completion", "approved")
REVIEWABLE_APPLICATION_STATUSES = {"submitted", "in_review"}


def map_application_status(profile_status: str) -> str:
    return PROFILE_STATUS_TO_APPLICATION_STATUS.get(profile_status, "На рассмотрении")


def get_admin_application_status_filters() -> AdminApplicationsFiltersResponse:
    return AdminApplicationsFiltersResponse(
        statuses=[
            AdminApplicationStatusFilterOption(value=status_label, label=status_label)
            for status_label in APPLICATION_STATUS_TO_PROFILE_STATUSES
        ]
    )


def _build_surname_prefix_search_filter(search: str):
    return StudentProfile.full_name.ilike(f"{search.strip()}%")


def list_admin_applications(
    db: Session,
    *,
    search: str | None = None,
    statuses: list[str] | None = None,
) -> AdminApplicationsListResponse:
    query = (
        db.query(StudentProfile)
        .join(User, User.id == StudentProfile.user_id)
        .filter(
            User.role == "student",
            StudentProfile.full_name.isnot(None),
            func.length(func.trim(StudentProfile.full_name)) > 0,
            StudentProfile.profile_status.in_(VISIBLE_APPLICATION_STATUSES),
        )
        .order_by(StudentProfile.full_name.asc())
    )

    if search and search.strip():
        query = query.filter(_build_surname_prefix_search_filter(search))

    if statuses:
        allowed_profile_statuses = sorted(
            {
                profile_status
                for status_label in statuses
                for profile_status in APPLICATION_STATUS_TO_PROFILE_STATUSES.get(status_label, ())
            }
        )
        if allowed_profile_statuses:
            query = query.filter(StudentProfile.profile_status.in_(allowed_profile_statuses))
        else:
            return AdminApplicationsListResponse(items=[])

    profiles = query.all()

    return AdminApplicationsListResponse(
        items=[
            AdminApplicationListItem(
                id=profile.id,
                full_name=profile.full_name,
                status=map_application_status(profile.profile_status),
            )
            for profile in profiles
        ]
    )


def _build_admin_application_detail(profile: StudentProfile) -> AdminApplicationDetailResponse:
    return AdminApplicationDetailResponse(
        id=profile.id,
        full_name=profile.full_name,
        birth_date=profile.birth_date,
        gender=profile.gender,
        quote=profile.quote,
        avatar_url=profile.avatar_url,
        status=map_application_status(profile.profile_status),
        grade_label=profile.grade_label,
        enrollment_date=profile.enrollment_date,
    )


def _get_admin_application_or_404(db: Session, application_id) -> StudentProfile:
    profile = (
        db.query(StudentProfile)
        .join(User, User.id == StudentProfile.user_id)
        .filter(
            StudentProfile.id == application_id,
            User.role == "student",
            StudentProfile.profile_status.in_(VISIBLE_APPLICATION_STATUSES),
        )
        .first()
    )

    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    return profile


def get_admin_application_detail(db: Session, *, application_id) -> AdminApplicationDetailResponse:
    profile = _get_admin_application_or_404(db, application_id)

    if profile.profile_status == "submitted":
        profile.profile_status = "in_review"
        try:
            db.commit()
            db.refresh(profile)
        except IntegrityError:
            db.rollback()
            profile = _get_admin_application_or_404(db, application_id)

    return _build_admin_application_detail(profile)


def update_admin_application(
    db: Session,
    *,
    application_id,
    payload: AdminApplicationUpdateRequest,
) -> AdminApplicationDetailResponse:
    profile = _get_admin_application_or_404(db, application_id)

    if payload.grade_label is not None:
        profile.grade_label = payload.grade_label.strip() or None
    if payload.enrollment_date is not None:
        profile.enrollment_date = payload.enrollment_date

    db.commit()
    db.refresh(profile)
    return _build_admin_application_detail(profile)


def request_admin_application_changes(
    db: Session,
    *,
    application_id,
) -> AdminApplicationDetailResponse:
    profile = _get_admin_application_or_404(db, application_id)

    if profile.profile_status not in REVIEWABLE_APPLICATION_STATUSES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Application cannot be sent for revision")

    profile.profile_status = "needs_completion"
    db.commit()
    db.refresh(profile)
    return _build_admin_application_detail(profile)


def approve_admin_application(
    db: Session,
    *,
    application_id,
) -> AdminApplicationDetailResponse:
    profile = _get_admin_application_or_404(db, application_id)

    if profile.profile_status not in REVIEWABLE_APPLICATION_STATUSES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Application cannot be approved")

    profile.profile_status = "approved"
    db.commit()
    db.refresh(profile)
    return _build_admin_application_detail(profile)
