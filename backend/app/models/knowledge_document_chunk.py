import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Integer, Text, Uuid, func
from sqlalchemy.orm import relationship

from app.db.base import Base


class KnowledgeDocumentChunk(Base):
    __tablename__ = "knowledge_document_chunks"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("knowledge_documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    char_count = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    document = relationship("KnowledgeDocument", back_populates="chunks")
