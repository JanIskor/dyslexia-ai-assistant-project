from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.dependencies import get_current_admin, get_db
from app.models.user import User
from app.schemas.admin_applications import (
    AdminApplicationDetailResponse,
    AdminApplicationsFiltersResponse,
    AdminApplicationsListResponse,
    AdminApplicationUpdateRequest,
)
from app.schemas.auth import UserResponse
from app.services.admin_applications_service import (
    approve_admin_application,
    get_admin_application_detail,
    get_admin_application_status_filters,
    list_admin_applications,
    request_admin_application_changes,
    update_admin_application,
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


@router.get("/applications/{application_id}", response_model=AdminApplicationDetailResponse)
def read_admin_application_detail(
    application_id: UUID,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return get_admin_application_detail(db, application_id=application_id)


@router.patch("/applications/{application_id}", response_model=AdminApplicationDetailResponse)
def patch_admin_application(
    application_id: UUID,
    payload: AdminApplicationUpdateRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return update_admin_application(db, application_id=application_id, payload=payload)


@router.post("/applications/{application_id}/request-changes", response_model=AdminApplicationDetailResponse)
def request_admin_application_changes_endpoint(
    application_id: UUID,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return request_admin_application_changes(db, application_id=application_id)


@router.post("/applications/{application_id}/approve", response_model=AdminApplicationDetailResponse)
def approve_admin_application_endpoint(
    application_id: UUID,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return approve_admin_application(db, application_id=application_id)
