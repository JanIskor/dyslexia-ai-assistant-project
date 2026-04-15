from datetime import datetime
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, StringConstraints


class TeacherLearningMaterialCreateRequest(BaseModel):
    title: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
    original_text: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class LearningMaterialResponse(BaseModel):
    id: UUID
    title: str
    original_text: str
    material_type: str
    status: str
    created_at: datetime
    updated_at: datetime


class TeacherLearningMaterialsListResponse(BaseModel):
    items: list[LearningMaterialResponse]
