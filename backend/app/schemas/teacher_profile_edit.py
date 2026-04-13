from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel


class TeacherProfileEditRequest(BaseModel):
    full_name: str | None = None
    birth_date: date | None = None
    gender: str | None = None
    position: str | None = None
    phone: str | None = None
    work_email: str | None = None
    subject_name: str | None = None
    avatar_url: str | None = None


class TeacherProfileEditResponse(BaseModel):
    id: UUID | None = None
    teacher_user_id: UUID
    full_name: str | None = None
    birth_date: date | None = None
    gender: str | None = None
    position: str | None = None
    phone: str | None = None
    work_email: str | None = None
    subject_name: str | None = None
    avatar_url: str | None = None
    status: str
    admin_comment: str | None = None
    updated_at: datetime | None = None
