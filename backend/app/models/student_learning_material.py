import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text, Uuid, UniqueConstraint, func
from sqlalchemy.orm import relationship

from app.db.base import Base


class StudentLearningMaterial(Base):
    __tablename__ = "student_learning_materials"
    __table_args__ = (
        UniqueConstraint(
            "student_user_id",
            "learning_material_id",
            name="uq_student_learning_materials_student_material",
        ),
    )

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    learning_material_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("learning_materials.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    assigned_by_teacher_user_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    assigned_title = Column(String, nullable=True)
    assigned_text = Column(Text, nullable=True)
    assigned_adaptation_mode = Column(String, nullable=True)
    assigned_is_adapted = Column(Boolean, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    student_user = relationship("User", foreign_keys=[student_user_id])
    learning_material = relationship("LearningMaterial")
    assigned_by_teacher_user = relationship("User", foreign_keys=[assigned_by_teacher_user_id])
