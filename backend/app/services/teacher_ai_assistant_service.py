from fastapi import HTTPException
from uuid import UUID

from sqlalchemy.orm import Session
from fastapi import UploadFile

from app.schemas.learning_materials import TeacherLearningMaterialCreateRequest
from app.services.adaptation_prompt_builder import RetrievedKnowledgeChunkPromptContext
from app.services.llm_service import PlainTextAdaptationRequest, get_llm_service
from app.schemas.teacher_ai_assistant import (
    TeacherAiAssistantMessageRequest,
    TeacherAiAssistantMessageResponse,
    TeacherAiAssistantParsedFileResponse,
    TeacherAiAssistantSaveMaterialRequest,
    TeacherAiAssistantSaveMaterialResponse,
)
from app.services.knowledge_base_parser import extract_text_from_knowledge_file, normalize_extracted_text
from app.services.learning_materials_service import create_learning_material
from app.services.retrieval_service import retrieve_relevant_chunks


MAX_ASSISTANT_INPUT_FILE_SIZE_BYTES = 5 * 1024 * 1024


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


def parse_teacher_ai_assistant_input_file(
    *,
    file: UploadFile,
) -> TeacherAiAssistantParsedFileResponse:
    filename = (file.filename or "").strip()
    if not filename:
        raise HTTPException(status_code=400, detail="Uploaded file must have a filename.")

    payload = file.file.read()
    if not payload:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    if len(payload) > MAX_ASSISTANT_INPUT_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail="Assistant input file size must be 5MB or less.",
        )

    extracted_text = extract_text_from_knowledge_file(
        filename=filename,
        mime_type=file.content_type,
        payload=payload,
    )
    cleaned_text = normalize_extracted_text(extracted_text)
    if not cleaned_text:
        raise HTTPException(
            status_code=400,
            detail="Empty extracted text. The document does not contain readable text.",
        )

    return TeacherAiAssistantParsedFileResponse(
        filename=filename,
        extracted_text=cleaned_text,
    )
