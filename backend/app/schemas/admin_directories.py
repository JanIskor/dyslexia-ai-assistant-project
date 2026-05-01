from datetime import date
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, EmailStr


AdminTeachersSort = Literal["surname_asc", "surname_desc"]
AdminStudentsSort = Literal["surname_asc", "surname_desc", "grade_asc", "grade_desc"]


class AdminTeacherListItem(BaseModel):
    id: UUID
    full_name: str
    subject_name: str
    work_email: str
    avatar_url: str | None = None
    current_students_count: int | None = None
    capacity_limit: int | None = None
    available_slots: int | None = None


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
    current_students_count: int = 0
    capacity_limit: int | None = None


class AdminTeacherDeleteResponse(BaseModel):
    detail: str
    teacher_user_id: UUID
    released_students_count: int


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


class AdminStudentDeleteResponse(BaseModel):
    detail: str
    student_user_id: UUID
    notified_teacher_user_id: UUID | None = None


class AdminTeacherCreateRequest(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    birth_date: date | None = None
    gender: str | None = None
    position: str | None = None
    phone: str | None = None
    work_email: EmailStr | None = None
    subject_name: str | None = None


class AdminUnassignedStudentListItem(BaseModel):
    application_id: UUID
    user_id: UUID
    full_name: str
    grade_label: str | None = None
    avatar_url: str | None = None
    profile_status: str


class AdminUnassignedStudentsListResponse(BaseModel):
    items: list[AdminUnassignedStudentListItem]
