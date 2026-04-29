from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel


class StudentTeacherRemovalRequestTeacherInfo(BaseModel):
    user_id: UUID
    full_name: str


class StudentTeacherRemovalRequestStudentInfo(BaseModel):
    user_id: UUID
    full_name: str
    grade_label: str | None = None


class StudentTeacherRemovalRequestItem(BaseModel):
    id: UUID
    teacher: StudentTeacherRemovalRequestTeacherInfo
    student: StudentTeacherRemovalRequestStudentInfo
    status: str
    reason: str | None = None
    admin_comment: str | None = None
    created_at: datetime
    resolved_at: datetime | None = None
    resolved_by_admin_user_id: UUID | None = None


class StudentTeacherRemovalRequestsListResponse(BaseModel):
    items: list[StudentTeacherRemovalRequestItem]


class TeacherStudentRemovalRequestCreateRequest(BaseModel):
    reason: str | None = None


class AdminStudentRemovalRequestUpdateRequest(BaseModel):
    action: Literal["approve", "reject"]
    admin_comment: str | None = None
