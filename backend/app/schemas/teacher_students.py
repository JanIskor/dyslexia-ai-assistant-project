from datetime import date
from uuid import UUID

from pydantic import BaseModel


class TeacherStudentListItem(BaseModel):
    id: UUID
    full_name: str
    grade_label: str
    avatar_url: str | None = None


class TeacherStudentDetail(BaseModel):
    id: UUID
    full_name: str
    birth_date: date
    gender: str
    grade_label: str
    enrollment_date: date
    quote: str | None = None
    avatar_url: str | None = None
