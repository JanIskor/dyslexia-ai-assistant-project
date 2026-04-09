from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel


class StudentProfileResponse(BaseModel):
    id: UUID
    user_id: UUID
    student_mode: str
    full_name: str | None = None
    birth_date: date | None = None
    gender: str | None = None
    grade_label: str | None = None
    enrollment_date: date | None = None
    quote: str | None = None
    avatar_url: str | None = None
    profile_status: str
    submitted_at: datetime | None = None

    class Config:
        from_attributes = True


class StudentProfileUpdateRequest(BaseModel):
    full_name: str | None = None
    birth_date: date | None = None
    gender: str | None = None
    quote: str | None = None
