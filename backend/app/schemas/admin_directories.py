from datetime import date
from typing import Literal
from uuid import UUID

from pydantic import BaseModel


AdminTeachersSort = Literal["surname_asc", "surname_desc"]
AdminStudentsSort = Literal["surname_asc", "surname_desc", "grade_asc", "grade_desc"]


class AdminTeacherListItem(BaseModel):
    id: UUID
    full_name: str
    subject_name: str
    work_email: str
    avatar_url: str | None = None


class AdminTeachersListResponse(BaseModel):
    items: list[AdminTeacherListItem]
    page: int
    page_size: int
    total: int
    total_pages: int


class AdminTeacherDetailResponse(BaseModel):
    id: UUID
    full_name: str
    birth_date: date
    gender: str
    position: str
    phone: str
    work_email: str
    subject_name: str
    avatar_url: str | None = None


class AdminStudentListItem(BaseModel):
    id: UUID
    full_name: str
    grade_label: str | None = None
    avatar_url: str | None = None


class AdminStudentsListResponse(BaseModel):
    items: list[AdminStudentListItem]
    page: int
    page_size: int
    total: int
    total_pages: int


class AdminStudentDetailResponse(BaseModel):
    id: UUID
    full_name: str
    birth_date: date | None = None
    gender: str | None = None
    grade_label: str | None = None
    enrollment_date: date | None = None
    quote: str | None = None
    avatar_url: str | None = None
