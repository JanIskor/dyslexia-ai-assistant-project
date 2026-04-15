import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Uuid, UniqueConstraint, func
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
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    student_user = relationship("User", foreign_keys=[student_user_id])
    learning_material = relationship("LearningMaterial")
    assigned_by_teacher_user = relationship("User", foreign_keys=[assigned_by_teacher_user_id])
