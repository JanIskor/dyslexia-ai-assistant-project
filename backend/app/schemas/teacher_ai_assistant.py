from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, StringConstraints

from app.schemas.learning_materials import LearningMaterialResponse
from app.services.adaptation_prompt_builder import DEFAULT_ADAPTATION_MODE, AdaptationMode


class TeacherAiAssistantMessageRequest(BaseModel):
    message: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
    mode: AdaptationMode = DEFAULT_ADAPTATION_MODE


class TeacherAiAssistantUsedKnowledgeChunk(BaseModel):
    document_title: str
    chunk_index: int


class TeacherAiAssistantMessageResponse(BaseModel):
    reply: str
    used_knowledge_chunks: list[TeacherAiAssistantUsedKnowledgeChunk]


class TeacherAiAssistantSaveMaterialRequest(BaseModel):
    title: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
    original_text: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
    adapted_text: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
    source_type: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
    source_material_id: UUID | None = None
    source_filename: str | None = None
    adaptation_mode: AdaptationMode = DEFAULT_ADAPTATION_MODE


class TeacherAiAssistantSaveMaterialResponse(LearningMaterialResponse):
    pass


class TeacherAiAssistantParsedFileResponse(BaseModel):
    filename: str
    extracted_text: str
