from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


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
    created_at: datetime
    updated_at: datetime


class KnowledgeDocumentsListResponse(BaseModel):
    items: list[KnowledgeDocumentResponse]


class KnowledgeDocumentChunkResponse(BaseModel):
    id: UUID
    chunk_index: int
    content: str
    char_count: int


class KnowledgeDocumentChunksListResponse(BaseModel):
    document_id: UUID
    items: list[KnowledgeDocumentChunkResponse]
