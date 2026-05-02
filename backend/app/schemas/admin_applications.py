from datetime import date
from uuid import UUID

from pydantic import BaseModel


class AdminApplicationListItem(BaseModel):
    id: UUID
    full_name: str
    status: str
    request_kind: str = "initial_profile"
    request_kind_label: str = "Первичная заявка"
    current_teacher_user_id: UUID | None = None
    teacher_review_status: str | None = None
    can_assign_teacher: bool = True


class AdminApplicationsListResponse(BaseModel):
    items: list[AdminApplicationListItem]


class AdminApplicationsBulkDeleteRequest(BaseModel):
    ids: list[UUID] = []
    delete_all: bool = False


class AdminApplicationsBulkDeleteResponse(BaseModel):
    detail: str
    deleted_count: int


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
    unavailable_reason: str | None = None


class AdminTeacherAssignmentOptionsResponse(BaseModel):
    items: list[AdminTeacherAssignmentOption]


class AdminApplicationDetailResponse(BaseModel):
    id: UUID
    request_kind: str = "initial_profile"
    request_kind_label: str = "Первичная заявка"
    full_name: str
    birth_date: date | None = None
    gender: str | None = None
    quote: str | None = None
    avatar_url: str | None = None
    position: str | None = None
    phone: str | None = None
    work_email: str | None = None
    subject_name: str | None = None
    status: str
    grade_label: str | None = None
    enrollment_date: date | None = None
    current_teacher_user_id: UUID | None = None
    current_teacher_full_name: str | None = None
    current_teacher_subject_name: str | None = None
    teacher_review_status: str | None = None
    current_profile_full_name: str | None = None
    current_profile_birth_date: date | None = None
    current_profile_gender: str | None = None
    current_profile_quote: str | None = None
    current_profile_position: str | None = None
    current_profile_phone: str | None = None
    current_profile_work_email: str | None = None
    current_profile_subject_name: str | None = None
    can_edit_admin_fields: bool = True
    can_assign_teacher: bool = True


class AdminApplicationUpdateRequest(BaseModel):
    grade_label: str | None = None
    enrollment_date: date | None = None


class AdminAssignTeacherRequest(BaseModel):
    teacher_user_id: UUID
