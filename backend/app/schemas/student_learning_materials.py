from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class StudentLearningMaterialListItem(BaseModel):
    id: UUID
    title: str
    preview_text: str
    is_adapted: bool
    created_at: datetime


class StudentLearningMaterialsListResponse(BaseModel):
    items: list[StudentLearningMaterialListItem]


class StudentLearningMaterialDetailResponse(BaseModel):
    id: UUID
    title: str
    original_text: str
    is_adapted: bool
    created_at: datetime
