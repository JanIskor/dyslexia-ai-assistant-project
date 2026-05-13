from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, StringConstraints

from app.schemas.learning_materials import LearningMaterialResponse
from app.schemas.learning_materials import AdaptationRationaleResponse
from app.services.adaptation_prompt_builder import (
    DEFAULT_ADAPTATION_GENRE,
    DEFAULT_ADAPTATION_MODE,
    AdaptationGenre,
    AdaptationMode,
)


class TeacherAiAssistantMessageRequest(BaseModel):
    message: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
    mode: AdaptationMode = DEFAULT_ADAPTATION_MODE
    genre: AdaptationGenre = DEFAULT_ADAPTATION_GENRE


class TeacherAiAssistantUsedKnowledgeChunk(BaseModel):
    document_title: str
    chunk_index: int


class TeacherAiAssistantMessageResponse(BaseModel):
    reply: str
    used_knowledge_chunks: list[TeacherAiAssistantUsedKnowledgeChunk]
    adaptation_rationale: AdaptationRationaleResponse


class TeacherAiAssistantSaveMaterialRequest(BaseModel):
    title: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
    original_text: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
    adapted_text: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
    source_type: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
    source_material_id: UUID | None = None
    source_filename: str | None = None
    adaptation_mode: AdaptationMode = DEFAULT_ADAPTATION_MODE
    adaptation_genre: AdaptationGenre | None = DEFAULT_ADAPTATION_GENRE
    adaptation_rationale: AdaptationRationaleResponse | None = None


class TeacherAiAssistantSaveMaterialResponse(LearningMaterialResponse):
    save_type: Literal["created", "updated"]


class TeacherAiAssistantSourceStatusRequest(BaseModel):
    original_text: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
    source_type: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
    source_material_id: UUID | None = None
    source_filename: str | None = None


class TeacherAiAssistantSourceStatusResponse(BaseModel):
    adaptation_group_key: str | None = None
    group_title: str | None = None


class TeacherAiAssistantParsedFileResponse(BaseModel):
    filename: str
    extracted_text: str
