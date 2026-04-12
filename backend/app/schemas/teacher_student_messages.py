from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class TeacherStudentMessageCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    body: str = Field(..., min_length=1, max_length=5000)


class TeacherStudentMessageItem(BaseModel):
    id: UUID
    teacher_user_id: UUID
    student_user_id: UUID
    title: str
    body: str
    is_read_by_student: bool
    created_at: datetime


class TeacherStudentMessagesListResponse(BaseModel):
    items: list[TeacherStudentMessageItem]
