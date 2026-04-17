from uuid import UUID

from sqlalchemy.orm import Session

from app.schemas.learning_materials import TeacherLearningMaterialCreateRequest
from app.services.llm_service import PlainTextAdaptationRequest, get_llm_service
from app.schemas.teacher_ai_assistant import (
    TeacherAiAssistantMessageRequest,
    TeacherAiAssistantMessageResponse,
    TeacherAiAssistantSaveMaterialRequest,
    TeacherAiAssistantSaveMaterialResponse,
)
from app.services.learning_materials_service import create_learning_material


def create_teacher_ai_assistant_reply(
    payload: TeacherAiAssistantMessageRequest,
) -> TeacherAiAssistantMessageResponse:
    adaptation_result = get_llm_service().adapt_plain_text(
        PlainTextAdaptationRequest(
            source_text=payload.message.strip(),
            mode=payload.mode,
        )
    )

    return TeacherAiAssistantMessageResponse(
        reply=adaptation_result.adapted_text
    )


def save_teacher_ai_assistant_material(
    db: Session,
    *,
    teacher_user_id: UUID,
    payload: TeacherAiAssistantSaveMaterialRequest,
) -> TeacherAiAssistantSaveMaterialResponse:
    material = create_learning_material(
        db,
        teacher_user_id=teacher_user_id,
        payload=TeacherLearningMaterialCreateRequest(
            title=payload.title,
            original_text=payload.adapted_text.strip() or payload.original_text,
        ),
    )

    return TeacherAiAssistantSaveMaterialResponse(**material.model_dump())
