from datetime import datetime
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, StringConstraints

from app.services.adaptation_prompt_builder import AdaptationMode


AssistantMaterialSourceType = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class TeacherLearningMaterialCreateRequest(BaseModel):
    title: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
    original_text: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
    adapted_text: str | None = None
    source_type: AssistantMaterialSourceType | None = None
    source_material_id: UUID | None = None
    source_filename: str | None = None
    adaptation_mode: AdaptationMode | None = None


class LearningMaterialResponse(BaseModel):
    id: UUID
    title: str
    original_text: str
    adapted_text: str | None = None
    material_type: str
    status: str
    source_type: str | None = None
    source_material_id: UUID | None = None
    source_filename: str | None = None
    adaptation_mode: AdaptationMode | None = None
    created_at: datetime
    updated_at: datetime


class TeacherLearningMaterialsListResponse(BaseModel):
    items: list[LearningMaterialResponse]


class TeacherLearningMaterialAssignRequest(BaseModel):
    student_user_id: UUID


class TeacherLearningMaterialAssignmentResponse(BaseModel):
    id: UUID
    student_user_id: UUID
    learning_material_id: UUID
    assigned_by_teacher_user_id: UUID
    created_at: datetime
