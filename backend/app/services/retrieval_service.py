from __future__ import annotations

import math
from dataclasses import dataclass
from collections import defaultdict

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
MAX_PROMPT_RETRIEVAL_CHUNKS = 12

MANDATORY_GENERAL_METHODOLOGY_FILES = (
    "01_general_principles.md",
    "07_controlled_adaptation_operations.md",
    "11_protected_span_policy.md",
    "12_forced_methodology_retrieval.md",
)
MANDATORY_GENRE_METHODOLOGY_FILES: dict[AdaptationGenre, tuple[str, ...]] = {
    "legal": (
        "05_genre_modes_a_b.md",
        "06_protected_elements_policy.md",
        "08_golden_templates_educational_legal.md",
    ),
    "educational": ("08_golden_templates_educational_legal.md",),
    "fiction": ("09_golden_templates_fiction.md",),
    "scientific_popular": ("10_golden_templates_scientific_popular.md",),
    "instruction": (),
    "other": (),
}
VKR_METHOD_DOCUMENT_MARKERS = ("вкр_метода", "vkr_methodology_authority")


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
    include_forced_methodology: bool = False,
) -> list[RetrievedChunk]:
    if top_k < 1 or top_k > MAX_RETRIEVAL_TOP_K:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"top_k must be between 1 and {MAX_RETRIEVAL_TOP_K}.",
        )

    query_embedding = embed_query(query_text)
    if db.bind is not None and db.bind.dialect.name == "sqlite":
        semantic_chunks = _retrieve_relevant_chunks_sqlite(
            db,
            query_embedding=query_embedding,
            top_k=top_k,
            selected_mode=selected_mode,
            selected_genre=selected_genre,
        )
    else:
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

        filtered_rows.sort(
            key=lambda row: (
                -_golden_template_priority(
                    document_title=row[1],
                    chunk_content=row[0].content,
                    document_tags=list(row[0].document.adaptation_modes or []) if row[0].document is not None else [],
                    selected_mode=selected_mode,
                    selected_genre=selected_genre,
                ),
                row[2],
                row[0].chunk_index,
            )
        )
        semantic_chunks = [
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

    if not include_forced_methodology:
        return semantic_chunks

    mandatory_chunks = _retrieve_forced_methodology_chunks(
        db,
        query_embedding=query_embedding,
        selected_mode=selected_mode,
        selected_genre=selected_genre,
    )
    return _merge_retrieval_chunks(mandatory_chunks=mandatory_chunks, semantic_chunks=semantic_chunks)


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

    filtered_rows.sort(
        key=lambda row: (
            -_golden_template_priority(
                document_title=row[1],
                chunk_content=row[0].content,
                document_tags=list(row[0].document.adaptation_modes or []) if row[0].document is not None else [],
                selected_mode=selected_mode,
                selected_genre=selected_genre,
            ),
            row[2],
            row[0].chunk_index,
        )
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
        for chunk, document_title, distance in filtered_rows[:top_k]
    ]


def _retrieve_forced_methodology_chunks(
    db: Session,
    *,
    query_embedding: list[float],
    selected_mode: AdaptationMode | None,
    selected_genre: AdaptationGenre | None,
) -> list[RetrievedChunk]:
    mandatory_order = _build_mandatory_methodology_order(selected_genre)
    if not mandatory_order:
        return []

    rows = (
        db.query(KnowledgeDocumentChunk, KnowledgeDocument)
        .join(KnowledgeDocument, KnowledgeDocument.id == KnowledgeDocumentChunk.document_id)
        .filter(
            KnowledgeDocumentChunk.embedding.is_not(None),
            KnowledgeDocument.status == "embedded",
            KnowledgeDocument.use_in_rag.is_(True),
        )
        .all()
    )

    by_document_key: dict[str, list[tuple[KnowledgeDocumentChunk, KnowledgeDocument, float]]] = defaultdict(list)
    for chunk, document in rows:
        document_key = _get_methodology_document_key(document)
        if document_key is None:
            continue
        if document_key not in mandatory_order:
            continue
        adaptation_modes = list(document.adaptation_modes or [])
        should_enforce_tag_match = not (
            document_key in MANDATORY_GENERAL_METHODOLOGY_FILES
            or (selected_genre is not None and document_key in MANDATORY_GENRE_METHODOLOGY_FILES.get(selected_genre, ()))
            or document_key in VKR_METHOD_DOCUMENT_MARKERS
        )
        if should_enforce_tag_match and adaptation_modes and not _document_matches_selected_tags(
            adaptation_modes,
            selected_mode=selected_mode,
            selected_genre=selected_genre,
        ):
            continue
        distance = _cosine_distance(query_embedding, list(chunk.embedding))
        by_document_key[document_key].append((chunk, document, distance))

    selected_chunks: list[tuple[int, RetrievedChunk]] = []
    for document_key, priority in mandatory_order.items():
        candidates = by_document_key.get(document_key) or []
        if not candidates:
            continue
        best_chunk, document, best_distance = sorted(
            candidates,
            key=lambda item: (item[2], item[0].chunk_index),
        )[0]
        selected_chunks.append(
            (
                priority,
                RetrievedChunk(
                    id=best_chunk.id,
                    document_id=best_chunk.document_id,
                    document_title=document.title,
                    chunk_index=best_chunk.chunk_index,
                    content=best_chunk.content,
                    distance=float(best_distance),
                    similarity=max(0.0, 1.0 - float(best_distance)),
                ),
            )
        )

    selected_chunks.sort(key=lambda item: (item[0], item[1].chunk_index))
    return [item[1] for item in selected_chunks]


def _build_mandatory_methodology_order(
    selected_genre: AdaptationGenre | None,
) -> dict[str, int]:
    order: dict[str, int] = {}
    priority = 0

    for marker in VKR_METHOD_DOCUMENT_MARKERS:
        order[marker] = priority
    priority += 1

    for filename in MANDATORY_GENERAL_METHODOLOGY_FILES:
        order[filename] = priority
        priority += 1

    if selected_genre is not None:
        for filename in MANDATORY_GENRE_METHODOLOGY_FILES.get(selected_genre, ()):
            order[filename] = priority
            priority += 1

    return order


def _get_methodology_document_key(document: KnowledgeDocument) -> str | None:
    title = (document.title or "").strip().lower()
    original_filename = (document.original_filename or "").strip().lower()

    for marker in VKR_METHOD_DOCUMENT_MARKERS:
        if marker in title or marker in original_filename:
            return marker

    for filename in (
        *MANDATORY_GENERAL_METHODOLOGY_FILES,
        *{name for names in MANDATORY_GENRE_METHODOLOGY_FILES.values() for name in names},
    ):
        normalized_filename = filename.lower()
        stem = normalized_filename.removesuffix(".md")
        if original_filename == normalized_filename or title == stem or title == normalized_filename:
            return filename

    return None


def _merge_retrieval_chunks(
    *,
    mandatory_chunks: list[RetrievedChunk],
    semantic_chunks: list[RetrievedChunk],
) -> list[RetrievedChunk]:
    merged: list[RetrievedChunk] = []
    seen: set[tuple[object, int]] = set()

    for chunk in [*mandatory_chunks, *semantic_chunks]:
        chunk_key = (chunk.document_id, chunk.chunk_index)
        if chunk_key in seen:
            continue
        merged.append(chunk)
        seen.add(chunk_key)

    return merged[:MAX_PROMPT_RETRIEVAL_CHUNKS]


def _cosine_distance(left: list[float], right: list[float]) -> float:
    numerator = sum(left_value * right_value for left_value, right_value in zip(left, right, strict=False))
    left_norm = math.sqrt(sum(value * value for value in left))
    right_norm = math.sqrt(sum(value * value for value in right))
    if left_norm == 0.0 or right_norm == 0.0:
        return 1.0
    similarity = numerator / (left_norm * right_norm)
    return 1.0 - similarity


def _golden_template_priority(
    *,
    document_title: str,
    chunk_content: str,
    document_tags: list[str],
    selected_mode: AdaptationMode | None,
    selected_genre: AdaptationGenre | None,
) -> int:
    if selected_mode is None or selected_genre is None:
        return 0

    normalized_title = (document_title or "").lower()
    normalized_content = (chunk_content or "").lower()
    looks_like_golden_template = (
        "golden" in normalized_title
        or "golden template" in normalized_content
        or "эталон" in normalized_content
        or "эталонн" in normalized_title
    )
    if not looks_like_golden_template:
        return 0

    selected_tags = set(build_retrieval_tags(selected_mode, selected_genre))
    document_tag_set = set(document_tags or [])
    has_genre_match = selected_genre in document_tag_set
    has_product_mode_match = selected_mode in document_tag_set

    if has_genre_match and has_product_mode_match:
        return 2
    if selected_tags & document_tag_set:
        return 1
    return 0
