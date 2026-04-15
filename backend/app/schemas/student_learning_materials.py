from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class StudentLearningMaterialListItem(BaseModel):
    id: UUID
    title: str
    created_at: datetime


class StudentLearningMaterialsListResponse(BaseModel):
    items: list[StudentLearningMaterialListItem]


class StudentLearningMaterialDetailResponse(BaseModel):
    id: UUID
    title: str
    original_text: str
    created_at: datetime
