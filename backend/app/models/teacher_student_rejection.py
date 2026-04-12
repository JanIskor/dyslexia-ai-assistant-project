import uuid

from sqlalchemy import CheckConstraint, Column, DateTime, ForeignKey, UniqueConstraint, Uuid, func

from app.db.base import Base


class TeacherStudentRejection(Base):
    __tablename__ = "teacher_student_rejections"
    __table_args__ = (
        CheckConstraint("teacher_user_id <> student_user_id", name="ck_teacher_student_rejections_distinct_users"),
        UniqueConstraint("teacher_user_id", "student_user_id", name="uq_teacher_student_rejections_teacher_student"),
    )

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    teacher_user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    student_user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
