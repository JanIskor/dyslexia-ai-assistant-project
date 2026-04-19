from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class KnowledgeDocumentResponse(BaseModel):
    id: UUID
    title: str
    original_filename: str
    mime_type: str
    file_size: int
    storage_object_key: str
    uploaded_by_user_id: UUID
    status: str
    extracted_text: str | None
    chunks_count: int
    embedded_chunks_count: int
    created_at: datetime
    updated_at: datetime


class KnowledgeDocumentsListResponse(BaseModel):
    items: list[KnowledgeDocumentResponse]


class KnowledgeDocumentChunkResponse(BaseModel):
    id: UUID
    chunk_index: int
    content: str
    char_count: int
    has_embedding: bool


class KnowledgeDocumentChunksListResponse(BaseModel):
    document_id: UUID
    items: list[KnowledgeDocumentChunkResponse]


class KnowledgeBaseRetrieveRequest(BaseModel):
    query: str
    top_k: int = Field(default=5, ge=1, le=10)


class KnowledgeBaseRetrievedChunkResponse(BaseModel):
    id: UUID
    document_id: UUID
    document_title: str
    chunk_index: int
    content: str
    distance: float
    similarity: float


class KnowledgeBaseRetrieveResponse(BaseModel):
    query: str
    top_k: int
    items: list[KnowledgeBaseRetrievedChunkResponse]
