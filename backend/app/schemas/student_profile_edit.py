from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel


class StudentProfileEditRequest(BaseModel):
    full_name: str | None = None
    birth_date: date | None = None
    gender: str | None = None
    quote: str | None = None
    avatar_url: str | None = None


class StudentProfileEditResponse(BaseModel):
    id: UUID | None = None
    student_user_id: UUID
    full_name: str | None = None
    birth_date: date | None = None
    gender: str | None = None
    quote: str | None = None
    avatar_url: str | None = None
    grade_label: str | None = None
    enrollment_date: date | None = None
    status: str
    admin_comment: str | None = None
    updated_at: datetime | None = None
