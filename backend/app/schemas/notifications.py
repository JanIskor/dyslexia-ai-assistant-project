from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class NotificationItem(BaseModel):
    id: UUID
    role: str
    type: str
    title: str
    message: str
    is_read: bool
    created_at: datetime


class NotificationsListResponse(BaseModel):
    items: list[NotificationItem]


class NotificationUnreadCountResponse(BaseModel):
    unread_count: int
