from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.student_profile import StudentProfile
from app.models.user import User
from app.schemas.admin_applications import (
    AdminApplicationListItem,
    AdminApplicationsFiltersResponse,
    AdminApplicationStatusFilterOption,
    AdminApplicationsListResponse,
)


PROFILE_STATUS_TO_APPLICATION_STATUS = {
    "draft": "Новая",
    "submitted": "На рассмотрении",
    "rejected": "Отклонена",
}

APPLICATION_STATUS_TO_PROFILE_STATUSES = {
    "Новая": ("draft",),
    "На рассмотрении": ("submitted",),
    "Отклонена": ("rejected",),
}


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
