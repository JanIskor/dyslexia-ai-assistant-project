from fastapi import HTTPException
from uuid import UUID

from sqlalchemy.orm import Session

from app.schemas.learning_materials import TeacherLearningMaterialCreateRequest
from app.services.adaptation_prompt_builder import RetrievedKnowledgeChunkPromptContext
from app.services.llm_service import PlainTextAdaptationRequest, get_llm_service
from app.schemas.teacher_ai_assistant import (
    TeacherAiAssistantMessageRequest,
    TeacherAiAssistantMessageResponse,
    TeacherAiAssistantSaveMaterialRequest,
    TeacherAiAssistantSaveMaterialResponse,
)
from app.services.learning_materials_service import create_learning_material
from app.services.retrieval_service import retrieve_relevant_chunks


def create_teacher_ai_assistant_reply(
    db: Session,
    payload: TeacherAiAssistantMessageRequest,
) -> TeacherAiAssistantMessageResponse:
    try:
        retrieved_chunks = retrieve_relevant_chunks(
            db,
            query_text=payload.message.strip(),
            top_k=3,
        )
    except HTTPException:
        retrieved_chunks = []

    adaptation_result = get_llm_service().adapt_plain_text(
        PlainTextAdaptationRequest(
            source_text=payload.message.strip(),
            mode=payload.mode,
            retrieved_chunks=[
                RetrievedKnowledgeChunkPromptContext(
                    document_title=chunk.document_title,
                    chunk_index=chunk.chunk_index,
                    content=chunk.content,
                )
                for chunk in retrieved_chunks
            ],
        )
    )

    return TeacherAiAssistantMessageResponse(
        reply=adaptation_result.adapted_text,
        used_knowledge_chunks=[
            {
                "document_title": chunk.document_title,
                "chunk_index": chunk.chunk_index,
            }
            for chunk in retrieved_chunks
        ],
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
