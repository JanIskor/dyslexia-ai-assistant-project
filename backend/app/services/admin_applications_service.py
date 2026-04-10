from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.student_profile import StudentProfile
from app.models.user import User
from app.schemas.admin_applications import AdminApplicationListItem, AdminApplicationsListResponse


PROFILE_STATUS_TO_APPLICATION_STATUS = {
    "draft": "Новая",
    "submitted": "На рассмотрении",
    "rejected": "Отклонена",
}


def map_application_status(profile_status: str) -> str:
    return PROFILE_STATUS_TO_APPLICATION_STATUS.get(profile_status, "На рассмотрении")


def list_admin_applications(
    db: Session,
    *,
    search: str | None = None,
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
        normalized_search = f"%{search.strip()}%"
        query = query.filter(StudentProfile.full_name.ilike(normalized_search))

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
