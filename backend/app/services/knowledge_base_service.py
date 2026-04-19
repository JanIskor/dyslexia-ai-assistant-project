from __future__ import annotations

from pathlib import Path
from uuid import UUID

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.models.knowledge_document import KnowledgeDocument
from app.schemas.knowledge_documents import (
    KnowledgeDocumentChunkResponse,
    KnowledgeDocumentChunksListResponse,
    KnowledgeDocumentResponse,
    KnowledgeDocumentsListResponse,
)
from app.services.knowledge_base_chunking_service import list_chunks_for_document, recreate_chunks_for_document
from app.services.embedding_service import EmbeddingServiceError, embed_chunks_for_document
from app.services.knowledge_base_parser import extract_text_from_knowledge_file, validate_knowledge_file_type
from app.services.storage_service import build_object_name, upload_file_bytes


MAX_KNOWLEDGE_FILE_SIZE_BYTES = 15 * 1024 * 1024


def upload_knowledge_document(
    db: Session,
    *,
    uploaded_by_user_id: UUID,
    file: UploadFile,
) -> KnowledgeDocumentResponse:
    filename = (file.filename or "").strip()
    if not filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must have a filename.",
        )

    payload = file.file.read()
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    if len(payload) > MAX_KNOWLEDGE_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Knowledge base file size must be 15MB or less.",
        )

    extension, normalized_mime_type = validate_knowledge_file_type(filename, file.content_type)
    object_key = build_object_name(
        prefix="knowledge-base",
        user_id=str(uploaded_by_user_id),
        filename=f"{Path(filename).stem}{extension}",
    )
    upload_file_bytes(payload=payload, object_name=object_key, content_type=normalized_mime_type)

    document = KnowledgeDocument(
        title=Path(filename).stem.strip() or filename,
        original_filename=filename,
        mime_type=normalized_mime_type,
        file_size=len(payload),
        storage_object_key=object_key,
        uploaded_by_user_id=uploaded_by_user_id,
        status="uploaded",
    )
    db.add(document)
    db.flush()

    try:
        extracted_text = extract_text_from_knowledge_file(
            filename=filename,
            mime_type=normalized_mime_type,
            payload=payload,
        )
    except HTTPException as error:
        document.status = "failed"
        db.commit()
        raise error
    except Exception as error:  # pragma: no cover
        document.status = "failed"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Parsing failed for the uploaded document.",
        ) from error

    document.extracted_text = extracted_text
    persisted_chunks = recreate_chunks_for_document(
        db,
        document_id=document.id,
        extracted_text=extracted_text,
    )
    embedded_chunks_count = 0
    if persisted_chunks:
        try:
            embedded_chunks_count = embed_chunks_for_document(db, document_id=document.id)
        except EmbeddingServiceError as error:
            document.status = "chunked"
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Embedding generation failed for the uploaded document.",
            ) from error

    if persisted_chunks and embedded_chunks_count == len(persisted_chunks):
        document.status = "embedded"
    elif persisted_chunks:
        document.status = "chunked"
    else:
        document.status = "parsed"

    db.commit()
    db.refresh(document)
    return _to_knowledge_document_response(document)


def list_knowledge_documents(db: Session) -> KnowledgeDocumentsListResponse:
    documents = db.query(KnowledgeDocument).order_by(KnowledgeDocument.created_at.desc()).all()
    return KnowledgeDocumentsListResponse(
        items=[_to_knowledge_document_response(document) for document in documents]
    )


def get_knowledge_document(db: Session, *, document_id: UUID) -> KnowledgeDocumentResponse | None:
    document = db.query(KnowledgeDocument).filter(KnowledgeDocument.id == document_id).first()
    if document is None:
        return None
    return _to_knowledge_document_response(document)


def get_knowledge_document_chunks(
    db: Session,
    *,
    document_id: UUID,
) -> KnowledgeDocumentChunksListResponse | None:
    document = db.query(KnowledgeDocument).filter(KnowledgeDocument.id == document_id).first()
    if document is None:
        return None

    chunks = list_chunks_for_document(db, document_id=document_id)
    return KnowledgeDocumentChunksListResponse(
        document_id=document_id,
        items=[
            KnowledgeDocumentChunkResponse(
                id=chunk.id,
                chunk_index=chunk.chunk_index,
                content=chunk.content,
                char_count=chunk.char_count,
                has_embedding=chunk.embedding is not None,
            )
            for chunk in chunks
        ],
    )


def reembed_knowledge_document(
    db: Session,
    *,
    document_id: UUID,
) -> KnowledgeDocumentResponse | None:
    document = db.query(KnowledgeDocument).filter(KnowledgeDocument.id == document_id).first()
    if document is None:
        return None

    try:
        embedded_chunks_count = embed_chunks_for_document(db, document_id=document_id)
    except EmbeddingServiceError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Embedding generation failed for the requested document.",
        ) from error

    if document.chunks and embedded_chunks_count == len(document.chunks):
        document.status = "embedded"

    db.commit()
    db.refresh(document)
    return _to_knowledge_document_response(document)


def _to_knowledge_document_response(document: KnowledgeDocument) -> KnowledgeDocumentResponse:
    embedded_chunks_count = sum(1 for chunk in document.chunks if chunk.embedding is not None)
    return KnowledgeDocumentResponse(
        id=document.id,
        title=document.title,
        original_filename=document.original_filename,
        mime_type=document.mime_type,
        file_size=document.file_size,
        storage_object_key=document.storage_object_key,
        uploaded_by_user_id=document.uploaded_by_user_id,
        status=document.status,
        extracted_text=document.extracted_text,
        chunks_count=len(document.chunks),
        embedded_chunks_count=embedded_chunks_count,
        created_at=document.created_at,
        updated_at=document.updated_at,
    )
