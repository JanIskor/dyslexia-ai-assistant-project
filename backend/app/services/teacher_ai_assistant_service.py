from fastapi import HTTPException
from uuid import UUID

from sqlalchemy.orm import Session
from fastapi import UploadFile

from app.schemas.learning_materials import TeacherLearningMaterialCreateRequest
from app.services.adaptation_rationale_service import build_adaptation_rationale
from app.services.adaptation_prompt_builder import (
    RetrievedKnowledgeChunkPromptContext,
    is_product_mode,
    resolve_strategy_mode,
)
from app.services.controlled_adaptation_policy_service import build_controlled_adaptation_policy
from app.services.factual_consistency_service import build_factual_consistency_report, extract_protected_elements
from app.services.llm_service import PlainTextAdaptationRequest, get_llm_service
from app.schemas.teacher_ai_assistant import (
    TeacherAiAssistantMessageRequest,
    TeacherAiAssistantMessageResponse,
    TeacherAiAssistantParsedFileResponse,
    TeacherAiAssistantSaveMaterialRequest,
    TeacherAiAssistantSaveMaterialResponse,
    TeacherAiAssistantSourceStatusRequest,
    TeacherAiAssistantSourceStatusResponse,
)
from app.services.knowledge_base_parser import extract_text_from_knowledge_file, normalize_extracted_text
from app.services.learning_materials_service import (
    get_adapted_group_status_for_source,
    save_or_update_adapted_learning_material,
)
from app.services.retrieval_service import retrieve_relevant_chunks


MAX_ASSISTANT_INPUT_FILE_SIZE_BYTES = 5 * 1024 * 1024


def _resolve_product_mode(mode: str) -> str:
    return mode if is_product_mode(mode) else "basic_simplify"


def create_teacher_ai_assistant_reply(
    db: Session,
    payload: TeacherAiAssistantMessageRequest,
) -> TeacherAiAssistantMessageResponse:
    source_text = payload.message.strip()
    protected_elements = extract_protected_elements(source_text)
    controlled_adaptation_policy = build_controlled_adaptation_policy(
        product_mode=_resolve_product_mode(payload.mode),
        strategy_mode=resolve_strategy_mode(payload.mode, payload.genre),
        genre=payload.genre,
        original_text=source_text,
        protected_elements=protected_elements,
    )
    try:
        retrieved_chunks = retrieve_relevant_chunks(
            db,
            query_text=source_text,
            top_k=3,
            selected_mode=payload.mode,
            selected_genre=payload.genre,
        )
    except HTTPException:
        retrieved_chunks = []

    adaptation_result = get_llm_service().adapt_plain_text(
        PlainTextAdaptationRequest(
            source_text=source_text,
            mode=payload.mode,
            genre=payload.genre,
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
    factual_consistency_report = build_factual_consistency_report(
        source_text=source_text,
        adapted_text=adaptation_result.adapted_text,
    )
    adaptation_rationale = build_adaptation_rationale(
        source_text=source_text,
        adapted_text=adaptation_result.adapted_text,
        mode=payload.mode,
        genre=payload.genre,
        controlled_adaptation_policy=controlled_adaptation_policy,
        factual_consistency_report=factual_consistency_report,
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
        adaptation_rationale=adaptation_rationale,
        factual_consistency_report=factual_consistency_report,
    )


def save_teacher_ai_assistant_material(
    db: Session,
    *,
    teacher_user_id: UUID,
    payload: TeacherAiAssistantSaveMaterialRequest,
) -> TeacherAiAssistantSaveMaterialResponse:
    protected_elements = extract_protected_elements(payload.original_text)
    controlled_adaptation_policy = build_controlled_adaptation_policy(
        product_mode=_resolve_product_mode(payload.adaptation_mode),
        strategy_mode=resolve_strategy_mode(payload.adaptation_mode, payload.adaptation_genre),
        genre=payload.adaptation_genre or "educational",
        original_text=payload.original_text,
        protected_elements=protected_elements,
    )
    factual_consistency_report_payload = (
        payload.factual_consistency_report.model_dump()
        if payload.factual_consistency_report is not None
        else build_factual_consistency_report(
            source_text=payload.original_text,
            adapted_text=payload.adapted_text,
        )
    )
    material, save_type = save_or_update_adapted_learning_material(
        db,
        teacher_user_id=teacher_user_id,
        payload=TeacherLearningMaterialCreateRequest(
            title=payload.title,
            original_text=payload.original_text,
            adapted_text=payload.adapted_text,
            source_type=payload.source_type,
            source_material_id=payload.source_material_id,
            source_filename=payload.source_filename,
            adaptation_mode=payload.adaptation_mode,
            adaptation_genre=payload.adaptation_genre,
            adaptation_rationale=(
                payload.adaptation_rationale.model_dump()
                if payload.adaptation_rationale is not None
                else build_adaptation_rationale(
                    source_text=payload.original_text,
                    adapted_text=payload.adapted_text,
                    mode=payload.adaptation_mode,
                    genre=payload.adaptation_genre,
                    controlled_adaptation_policy=controlled_adaptation_policy,
                    factual_consistency_report=factual_consistency_report_payload,
                )
            ),
            factual_consistency_report=factual_consistency_report_payload,
        ),
    )

    return TeacherAiAssistantSaveMaterialResponse(
        **material.model_dump(),
        save_type=save_type,
    )


def get_teacher_ai_assistant_source_status(
    db: Session,
    *,
    teacher_user_id: UUID,
    payload: TeacherAiAssistantSourceStatusRequest,
) -> TeacherAiAssistantSourceStatusResponse:
    adaptation_group_key, group_title = get_adapted_group_status_for_source(
        db,
        teacher_user_id=teacher_user_id,
        original_text=payload.original_text,
        source_type=payload.source_type,
        source_material_id=payload.source_material_id,
        source_filename=payload.source_filename,
    )
    return TeacherAiAssistantSourceStatusResponse(
        adaptation_group_key=adaptation_group_key if group_title else None,
        group_title=group_title,
    )


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
