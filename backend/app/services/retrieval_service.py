from __future__ import annotations

import math
from dataclasses import dataclass

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.knowledge_document import KnowledgeDocument
from app.models.knowledge_document_chunk import KnowledgeDocumentChunk
from app.services.adaptation_prompt_builder import (
    ALL_METHODOLOGY_TAGS,
    ALL_GENRE_TAGS,
    AdaptationGenre,
    AdaptationMode,
    build_retrieval_tags,
)
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
    selected_genre: AdaptationGenre | None = None,
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
            selected_genre=selected_genre,
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
        .order_by(distance_expression.asc(), KnowledgeDocumentChunk.chunk_index.asc())
        .all()
    )

    filtered_rows: list[tuple[KnowledgeDocumentChunk, str, float]] = []
    for chunk, document_title, distance in rows:
        document = chunk.document
        adaptation_tags = list(document.adaptation_modes or []) if document is not None else []
        if not _document_matches_selected_tags(
            adaptation_tags,
            selected_mode=selected_mode,
            selected_genre=selected_genre,
        ):
            continue
        filtered_rows.append((chunk, document_title, float(distance)))

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


def _document_matches_selected_tags(
    document_tags: list[str] | None,
    *,
    selected_mode: AdaptationMode | None,
    selected_genre: AdaptationGenre | None,
) -> bool:
    normalized_tags = [tag for tag in (document_tags or []) if isinstance(tag, str) and tag.strip()]
    if not normalized_tags:
        return True

    allowed_tags = set(build_retrieval_tags(selected_mode, selected_genre)) if selected_mode else set()
    for tag in normalized_tags:
        if tag == "general":
            continue

        if tag in ALL_METHODOLOGY_TAGS:
            if tag in ALL_GENRE_TAGS and selected_genre is None:
                return False
            if tag not in allowed_tags:
                return False
            continue

        return False

    return True


def _retrieve_relevant_chunks_sqlite(
    db: Session,
    *,
    query_embedding: list[float],
    top_k: int,
    selected_mode: AdaptationMode | None,
    selected_genre: AdaptationGenre | None,
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
        if not _document_matches_selected_tags(
            adaptation_modes,
            selected_mode=selected_mode,
            selected_genre=selected_genre,
        ):
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
