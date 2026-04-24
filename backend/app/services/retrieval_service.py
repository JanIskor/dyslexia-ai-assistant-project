from __future__ import annotations

import math
from dataclasses import dataclass

from fastapi import HTTPException, status
from sqlalchemy import cast, func, or_
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import JSONB

from app.models.knowledge_document import KnowledgeDocument
from app.models.knowledge_document_chunk import KnowledgeDocumentChunk
from app.services.adaptation_prompt_builder import AdaptationMode
from app.services.embedding_service import EmbeddingServiceError, embed_text


MAX_RETRIEVAL_TOP_K = 10


@dataclass
class RetrievedChunk:
    id: object
    document_id: object
    document_title: str
    chunk_index: int
    content: str
    distance: float
    similarity: float


def embed_query(text: str) -> list[float]:
    normalized_query = text.strip()
    if not normalized_query:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Query must not be empty.",
        )

    try:
        query_embedding = embed_text(normalized_query)
    except EmbeddingServiceError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Embedding generation failed for the retrieval query.",
        ) from error

    if query_embedding is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Query must not be empty.",
        )

    return query_embedding


def retrieve_relevant_chunks(
    db: Session,
    *,
    query_text: str,
    top_k: int = 5,
    selected_mode: AdaptationMode | None = None,
) -> list[RetrievedChunk]:
    if top_k < 1 or top_k > MAX_RETRIEVAL_TOP_K:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"top_k must be between 1 and {MAX_RETRIEVAL_TOP_K}.",
        )

    query_embedding = embed_query(query_text)
    if db.bind is not None and db.bind.dialect.name == "sqlite":
        return _retrieve_relevant_chunks_sqlite(
            db,
            query_embedding=query_embedding,
            top_k=top_k,
            selected_mode=selected_mode,
        )

    distance_expression = KnowledgeDocumentChunk.embedding.cosine_distance(query_embedding)

    rows = (
        db.query(
            KnowledgeDocumentChunk,
            KnowledgeDocument.title.label("document_title"),
            distance_expression.label("distance"),
        )
        .join(KnowledgeDocument, KnowledgeDocument.id == KnowledgeDocumentChunk.document_id)
        .filter(
            KnowledgeDocumentChunk.embedding.is_not(None),
            KnowledgeDocument.status == "embedded",
            KnowledgeDocument.use_in_rag.is_(True),
        )
        .filter(_build_mode_filter(selected_mode))
        .order_by(distance_expression.asc(), KnowledgeDocumentChunk.chunk_index.asc())
        .limit(top_k)
        .all()
    )

    return [
        RetrievedChunk(
            id=chunk.id,
            document_id=chunk.document_id,
            document_title=document_title,
            chunk_index=chunk.chunk_index,
            content=chunk.content,
            distance=float(distance),
            similarity=max(0.0, 1.0 - float(distance)),
        )
        for chunk, document_title, distance in rows
    ]


def _build_mode_filter(selected_mode: AdaptationMode | None):
    adaptation_modes_jsonb = cast(KnowledgeDocument.adaptation_modes, JSONB)
    is_general_document = or_(
        KnowledgeDocument.adaptation_modes.is_(None),
        func.jsonb_array_length(
            func.coalesce(
                adaptation_modes_jsonb,
                cast("[]", JSONB),
            )
        )
        == 0,
    )

    if selected_mode is None:
        return is_general_document

    return or_(
        is_general_document,
        adaptation_modes_jsonb.contains([selected_mode]),
    )


def _retrieve_relevant_chunks_sqlite(
    db: Session,
    *,
    query_embedding: list[float],
    top_k: int,
    selected_mode: AdaptationMode | None,
) -> list[RetrievedChunk]:
    rows = (
        db.query(KnowledgeDocumentChunk, KnowledgeDocument.title.label("document_title"), KnowledgeDocument)
        .join(KnowledgeDocument, KnowledgeDocument.id == KnowledgeDocumentChunk.document_id)
        .filter(
            KnowledgeDocumentChunk.embedding.is_not(None),
            KnowledgeDocument.status == "embedded",
            KnowledgeDocument.use_in_rag.is_(True),
        )
        .all()
    )

    filtered_rows: list[tuple[KnowledgeDocumentChunk, str, float]] = []
    for chunk, document_title, document in rows:
        adaptation_modes = list(document.adaptation_modes or [])
        if adaptation_modes and selected_mode is not None and selected_mode not in adaptation_modes:
            continue
        if adaptation_modes and selected_mode is None:
            continue

        distance = _cosine_distance(query_embedding, list(chunk.embedding))
        filtered_rows.append((chunk, document_title, distance))

    filtered_rows.sort(key=lambda row: (row[2], row[0].chunk_index))
    return [
        RetrievedChunk(
            id=chunk.id,
            document_id=chunk.document_id,
            document_title=document_title,
            chunk_index=chunk.chunk_index,
            content=chunk.content,
            distance=float(distance),
            similarity=max(0.0, 1.0 - float(distance)),
        )
        for chunk, document_title, distance in filtered_rows[:top_k]
    ]


def _cosine_distance(left: list[float], right: list[float]) -> float:
    numerator = sum(left_value * right_value for left_value, right_value in zip(left, right, strict=False))
    left_norm = math.sqrt(sum(value * value for value in left))
    right_norm = math.sqrt(sum(value * value for value in right))
    if left_norm == 0.0 or right_norm == 0.0:
        return 1.0
    similarity = numerator / (left_norm * right_norm)
    return 1.0 - similarity
