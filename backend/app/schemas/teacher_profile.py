from datetime import date
from uuid import UUID

from pydantic import BaseModel


class TeacherProfileResponse(BaseModel):
    id: UUID
    user_id: UUID
    full_name: str
    birth_date: date
    gender: str
    position: str
    phone: str
    work_email: str
    subject_name: str
    avatar_url: str | None = None
