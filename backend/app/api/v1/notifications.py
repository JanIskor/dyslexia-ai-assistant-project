from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.schemas.notifications import NotificationItem, NotificationsListResponse, NotificationUnreadCountResponse
from app.services.notifications_service import (
    get_user_unread_notifications_count,
    list_user_notifications,
    mark_all_notifications_as_read,
    mark_notification_as_read,
)

router = APIRouter(prefix="/notifications", tags=["Notifications"])

notifications_security = HTTPBearer(auto_error=False)


def get_current_user_for_notifications(
    credentials: HTTPAuthorizationCredentials | None = Depends(notifications_security),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return get_current_user(credentials=credentials, db=db)


@router.get("", response_model=NotificationsListResponse)
def read_notifications(
    current_user: User = Depends(get_current_user_for_notifications),
    db: Session = Depends(get_db),
):
    return list_user_notifications(db, user_id=current_user.id)


@router.get("/unread-count", response_model=NotificationUnreadCountResponse)
def read_unread_notifications_count(
    current_user: User = Depends(get_current_user_for_notifications),
    db: Session = Depends(get_db),
):
    return get_user_unread_notifications_count(db, user_id=current_user.id)


@router.post("/{notification_id}/read", response_model=NotificationItem)
def read_notification(
    notification_id: UUID,
    current_user: User = Depends(get_current_user_for_notifications),
    db: Session = Depends(get_db),
):
    return mark_notification_as_read(db, user_id=current_user.id, notification_id=notification_id)


@router.post("/read-all", response_model=NotificationUnreadCountResponse)
def read_all_notifications(
    current_user: User = Depends(get_current_user_for_notifications),
    db: Session = Depends(get_db),
):
    return mark_all_notifications_as_read(db, user_id=current_user.id)
