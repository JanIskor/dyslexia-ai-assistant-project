from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.models.user import User
from app.schemas.notifications import NotificationItem, NotificationsListResponse, NotificationUnreadCountResponse


def _build_notification_item(notification: Notification) -> NotificationItem:
    return NotificationItem(
        id=notification.id,
        role=notification.role,
        type=notification.type,
        title=notification.title,
        message=notification.message,
        is_read=notification.is_read,
        created_at=notification.created_at,
    )


def create_notification(
    db: Session,
    *,
    user_id: UUID,
    role: str,
    type: str,
    title: str,
    message: str,
) -> Notification:
    notification = Notification(
        user_id=user_id,
        role=role,
        type=type,
        title=title,
        message=message,
    )
    db.add(notification)
    return notification


def create_notifications_for_role(
    db: Session,
    *,
    role: str,
    type: str,
    title: str,
    message: str,
) -> None:
    recipient_ids = [
        row.id
        for row in db.query(User.id)
        .filter(
            User.role == role,
            User.is_active.is_(True),
        )
        .all()
    ]

    for user_id in recipient_ids:
        create_notification(
            db,
            user_id=user_id,
            role=role,
            type=type,
            title=title,
            message=message,
        )


def list_user_notifications(db: Session, *, user_id: UUID) -> NotificationsListResponse:
    notifications = (
        db.query(Notification)
        .filter(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .all()
    )
    return NotificationsListResponse(items=[_build_notification_item(notification) for notification in notifications])


def get_user_unread_notifications_count(db: Session, *, user_id: UUID) -> NotificationUnreadCountResponse:
    unread_count = (
        db.query(func.count(Notification.id))
        .filter(
            Notification.user_id == user_id,
            Notification.is_read.is_(False),
        )
        .scalar()
        or 0
    )
    return NotificationUnreadCountResponse(unread_count=unread_count)


def mark_notification_as_read(
    db: Session,
    *,
    user_id: UUID,
    notification_id: UUID,
) -> NotificationItem:
    notification = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_id == user_id,
        )
        .first()
    )
    if notification is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return _build_notification_item(notification)


def mark_all_notifications_as_read(
    db: Session,
    *,
    user_id: UUID,
) -> NotificationUnreadCountResponse:
    (
        db.query(Notification)
        .filter(
            Notification.user_id == user_id,
            Notification.is_read.is_(False),
        )
        .update({"is_read": True}, synchronize_session=False)
    )
    db.commit()
    return NotificationUnreadCountResponse(unread_count=0)
