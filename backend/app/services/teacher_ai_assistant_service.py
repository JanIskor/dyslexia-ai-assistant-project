from app.services.llm_service import PlainTextAdaptationRequest, get_llm_service
from app.schemas.teacher_ai_assistant import (
    TeacherAiAssistantMessageRequest,
    TeacherAiAssistantMessageResponse,
)


def create_teacher_ai_assistant_reply(
    payload: TeacherAiAssistantMessageRequest,
) -> TeacherAiAssistantMessageResponse:
    adaptation_result = get_llm_service().adapt_plain_text(
        PlainTextAdaptationRequest(source_text=payload.message.strip())
    )

    return TeacherAiAssistantMessageResponse(
        reply=adaptation_result.adapted_text
    )
