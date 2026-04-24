import uuid

from sqlalchemy import JSON, BigInteger, Boolean, Column, DateTime, ForeignKey, String, Text, Uuid, func, text
from sqlalchemy.ext.mutable import MutableList
from sqlalchemy.orm import relationship

from app.db.base import Base


class KnowledgeDocument(Base):
    __tablename__ = "knowledge_documents"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    mime_type = Column(String, nullable=False)
    file_size = Column(BigInteger, nullable=False)
    storage_object_key = Column(String, nullable=False, unique=True)
    uploaded_by_user_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status = Column(String, nullable=False, default="uploaded", server_default="uploaded")
    use_in_rag = Column(Boolean, nullable=False, default=False, server_default=text("false"))
    adaptation_modes = Column(
        MutableList.as_mutable(JSON),
        nullable=False,
        default=list,
        server_default=text("'[]'"),
    )
    extracted_text = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    uploaded_by_user = relationship("User")
    chunks = relationship(
        "KnowledgeDocumentChunk",
        back_populates="document",
        cascade="all, delete-orphan",
        order_by="KnowledgeDocumentChunk.chunk_index",
    )
