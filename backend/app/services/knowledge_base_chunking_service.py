from __future__ import annotations

from dataclasses import dataclass
from typing import Final
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.knowledge_document_chunk import KnowledgeDocumentChunk


TARGET_CHUNK_SIZE: Final[int] = 1000
MIN_CHUNK_SIZE: Final[int] = 800
CHUNK_OVERLAP: Final[int] = 150
HARD_MAX_CHUNK_SIZE: Final[int] = 1200


@dataclass
class BuiltKnowledgeChunk:
    chunk_index: int
    content: str
    char_count: int


def build_chunks_from_text(extracted_text: str) -> list[BuiltKnowledgeChunk]:
    normalized_text = extracted_text.strip()
    if not normalized_text:
        return []

    blocks = [block.strip() for block in normalized_text.split("\n\n") if block.strip()]
    if not blocks:
        blocks = [normalized_text]

    prepared_blocks: list[str] = []
    for block in blocks:
        prepared_blocks.extend(_split_large_block(block))

    chunks: list[str] = []
    current_parts: list[str] = []
    current_length = 0

    for block in prepared_blocks:
        separator_length = 2 if current_parts else 0
        prospective_length = current_length + separator_length + len(block)

        if current_parts and prospective_length > TARGET_CHUNK_SIZE and current_length >= MIN_CHUNK_SIZE:
            chunks.append("\n\n".join(current_parts).strip())
            overlap_text = _tail_overlap(chunks[-1])
            current_parts = [overlap_text, block] if overlap_text else [block]
            current_length = len("\n\n".join(current_parts))
            continue

        current_parts.append(block)
        current_length = prospective_length

    if current_parts:
        chunks.append("\n\n".join(current_parts).strip())

    return [
        BuiltKnowledgeChunk(
            chunk_index=index,
            content=chunk,
            char_count=len(chunk),
        )
        for index, chunk in enumerate(chunks)
        if chunk.strip()
    ]


def recreate_chunks_for_document(db: Session, *, document_id: UUID, extracted_text: str | None) -> list[KnowledgeDocumentChunk]:
    db.query(KnowledgeDocumentChunk).filter(KnowledgeDocumentChunk.document_id == document_id).delete()

    if not extracted_text or not extracted_text.strip():
        return []

    built_chunks = build_chunks_from_text(extracted_text)
    if not built_chunks:
        return []

    persisted_chunks: list[KnowledgeDocumentChunk] = []
    for built_chunk in built_chunks:
        chunk = KnowledgeDocumentChunk(
            document_id=document_id,
            chunk_index=built_chunk.chunk_index,
            content=built_chunk.content,
            char_count=built_chunk.char_count,
        )
        db.add(chunk)
        persisted_chunks.append(chunk)

    db.flush()
    return persisted_chunks


def list_chunks_for_document(db: Session, *, document_id: UUID) -> list[KnowledgeDocumentChunk]:
    return (
        db.query(KnowledgeDocumentChunk)
        .filter(KnowledgeDocumentChunk.document_id == document_id)
        .order_by(KnowledgeDocumentChunk.chunk_index.asc())
        .all()
    )


def _split_large_block(block: str) -> list[str]:
    if len(block) <= HARD_MAX_CHUNK_SIZE:
        return [block]

    pieces: list[str] = []
    remaining = block.strip()
    while len(remaining) > HARD_MAX_CHUNK_SIZE:
        split_at = remaining.rfind(" ", 0, HARD_MAX_CHUNK_SIZE)
        if split_at == -1 or split_at < MIN_CHUNK_SIZE:
            split_at = HARD_MAX_CHUNK_SIZE
        piece = remaining[:split_at].strip()
        if piece:
            pieces.append(piece)
        overlap_start = max(0, split_at - CHUNK_OVERLAP)
        remaining = remaining[overlap_start:].strip()

    if remaining:
        pieces.append(remaining)

    return pieces


def _tail_overlap(text: str) -> str:
    if len(text) <= CHUNK_OVERLAP:
        return text.strip()

    tail = text[-CHUNK_OVERLAP:]
    boundary = tail.find(" ")
    if boundary != -1 and boundary < len(tail) - 1:
        tail = tail[boundary + 1 :]
    return tail.strip()
