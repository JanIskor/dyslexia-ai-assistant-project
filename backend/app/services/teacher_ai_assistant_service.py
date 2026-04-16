from app.schemas.teacher_ai_assistant import (
    TeacherAiAssistantMessageRequest,
    TeacherAiAssistantMessageResponse,
)


def create_teacher_ai_assistant_reply(
    payload: TeacherAiAssistantMessageRequest,
) -> TeacherAiAssistantMessageResponse:
    _ = payload

    return TeacherAiAssistantMessageResponse(
        reply="Это тестовый ответ ИИ-ассистента. Здесь позже будет адаптированный текст."
    )
