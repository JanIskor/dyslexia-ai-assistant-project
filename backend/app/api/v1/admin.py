from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_admin, get_db
from app.models.user import User
from app.schemas.admin_applications import AdminApplicationsFiltersResponse
from app.schemas.auth import UserResponse
from app.schemas.admin_applications import AdminApplicationsListResponse
from app.services.admin_applications_service import (
    get_admin_application_status_filters,
    list_admin_applications,
)

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/access-check", response_model=UserResponse)
def read_admin_access_check(current_admin: User = Depends(get_current_admin)):
    return UserResponse.model_validate(current_admin)


@router.get("/applications", response_model=AdminApplicationsListResponse)
def read_admin_applications(
    search: str | None = Query(default=None),
    status: list[str] | None = Query(default=None),
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return list_admin_applications(db, search=search, statuses=status)


@router.get("/applications/filters", response_model=AdminApplicationsFiltersResponse)
def read_admin_application_filters(current_admin: User = Depends(get_current_admin)):
    return get_admin_application_status_filters()
