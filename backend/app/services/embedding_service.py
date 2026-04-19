from __future__ import annotations

from functools import lru_cache
from uuid import UUID

from sentence_transformers import SentenceTransformer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.knowledge_document_chunk import KnowledgeDocumentChunk


class EmbeddingServiceError(Exception):
    pass


def embed_text(text: str) -> list[float] | None:
    normalized_text = text.strip()
    if not normalized_text:
        return None

    try:
        model = _get_embedding_model()
        vector = model.encode(
            normalized_text,
            normalize_embeddings=True,
            convert_to_numpy=True,
        )
    except Exception as error:  # pragma: no cover
        raise EmbeddingServiceError("Failed to generate embedding.") from error

    return vector.astype(float).tolist()


def embed_chunk(chunk: KnowledgeDocumentChunk) -> bool:
    embedding = embed_text(chunk.content)
    if embedding is None:
        return False

    chunk.embedding = embedding
    return True


def embed_chunks_for_document(db: Session, *, document_id: UUID) -> int:
    chunks = (
        db.query(KnowledgeDocumentChunk)
        .populate_existing()
        .filter(KnowledgeDocumentChunk.document_id == document_id)
        .order_by(KnowledgeDocumentChunk.chunk_index.asc())
        .all()
    )

    embedded_count = 0
    for chunk in chunks:
        if embed_chunk(chunk):
            embedded_count += 1

    db.flush()
    return embedded_count


@lru_cache(maxsize=1)
def _get_embedding_model() -> SentenceTransformer:
    return SentenceTransformer(settings.EMBEDDING_MODEL_NAME, device="cpu")
