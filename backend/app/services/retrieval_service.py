from __future__ import annotations

from dataclasses import dataclass

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.knowledge_document import KnowledgeDocument
from app.models.knowledge_document_chunk import KnowledgeDocumentChunk
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
) -> list[RetrievedChunk]:
    if top_k < 1 or top_k > MAX_RETRIEVAL_TOP_K:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"top_k must be between 1 and {MAX_RETRIEVAL_TOP_K}.",
        )

    query_embedding = embed_query(query_text)
    distance_expression = KnowledgeDocumentChunk.embedding.cosine_distance(query_embedding)

    rows = (
        db.query(
            KnowledgeDocumentChunk,
            KnowledgeDocument.title.label("document_title"),
            distance_expression.label("distance"),
        )
        .join(KnowledgeDocument, KnowledgeDocument.id == KnowledgeDocumentChunk.document_id)
        .filter(KnowledgeDocumentChunk.embedding.is_not(None))
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
