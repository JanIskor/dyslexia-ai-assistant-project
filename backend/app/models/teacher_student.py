import uuid

from sqlalchemy import CheckConstraint, Column, DateTime, ForeignKey, Uuid, func
from sqlalchemy.orm import relationship

from app.db.base import Base


class TeacherStudent(Base):
    __tablename__ = "teacher_students"
    __table_args__ = (
        CheckConstraint("teacher_user_id <> student_user_id", name="ck_teacher_students_distinct_users"),
    )

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    teacher_user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    student_user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    teacher_user = relationship("User", foreign_keys=[teacher_user_id], back_populates="teacher_links")
    student_user = relationship("User", foreign_keys=[student_user_id], back_populates="student_links")
