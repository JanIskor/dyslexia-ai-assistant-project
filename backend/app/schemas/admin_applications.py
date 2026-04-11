from datetime import date
from uuid import UUID

from pydantic import BaseModel


class AdminApplicationListItem(BaseModel):
    id: UUID
    full_name: str
    status: str


class AdminApplicationsListResponse(BaseModel):
    items: list[AdminApplicationListItem]


class AdminApplicationStatusFilterOption(BaseModel):
    value: str
    label: str


class AdminApplicationsFiltersResponse(BaseModel):
    statuses: list[AdminApplicationStatusFilterOption]


class AdminTeacherAssignmentOption(BaseModel):
    teacher_user_id: UUID
    full_name: str
    subject_name: str
    student_count: int
    capacity: int
    is_available: bool


class AdminTeacherAssignmentOptionsResponse(BaseModel):
    items: list[AdminTeacherAssignmentOption]


class AdminApplicationDetailResponse(BaseModel):
    id: UUID
    full_name: str
    birth_date: date | None = None
    gender: str | None = None
    quote: str | None = None
    avatar_url: str | None = None
    status: str
    grade_label: str | None = None
    enrollment_date: date | None = None


class AdminApplicationUpdateRequest(BaseModel):
    grade_label: str | None = None
    enrollment_date: date | None = None


class AdminAssignTeacherRequest(BaseModel):
    teacher_user_id: UUID
