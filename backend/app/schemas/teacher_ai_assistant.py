from typing import Annotated

from pydantic import BaseModel, StringConstraints

from app.schemas.learning_materials import LearningMaterialResponse


class TeacherAiAssistantMessageRequest(BaseModel):
    message: str


class TeacherAiAssistantMessageResponse(BaseModel):
    reply: str


class TeacherAiAssistantSaveMaterialRequest(BaseModel):
    title: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
    original_text: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
    adapted_text: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class TeacherAiAssistantSaveMaterialResponse(LearningMaterialResponse):
    pass
