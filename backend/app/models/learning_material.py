import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, Text, Uuid, func
from sqlalchemy.orm import relationship

from app.db.base import Base


class LearningMaterial(Base):
    __tablename__ = "learning_materials"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    teacher_user_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title = Column(String, nullable=False)
    original_text = Column(Text, nullable=False)
    adapted_text = Column(Text, nullable=True)
    material_type = Column(String, nullable=False, default="text", server_default="text")
    status = Column(String, nullable=False, default="draft", server_default="draft")
    source_type = Column(String, nullable=True)
    source_material_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("learning_materials.id", ondelete="SET NULL"),
        nullable=True,
    )
    source_filename = Column(String, nullable=True)
    adaptation_mode = Column(String, nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    teacher_user = relationship("User")
