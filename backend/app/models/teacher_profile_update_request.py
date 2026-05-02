import uuid

from sqlalchemy import CheckConstraint, Column, Date, DateTime, ForeignKey, String, Text, Uuid, func

from app.db.base import Base


class TeacherProfileUpdateRequest(Base):
    __tablename__ = "teacher_profile_update_requests"
    __table_args__ = (
        CheckConstraint(
            "status IN ('draft', 'submitted', 'in_review', 'revision_requested', 'approved')",
            name="ck_teacher_profile_update_requests_status",
        ),
    )

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    teacher_user_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    full_name = Column(String, nullable=True)
    birth_date = Column(Date, nullable=True)
    gender = Column(String, nullable=True)
    position = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    work_email = Column(String, nullable=True)
    subject_name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    status = Column(String, nullable=False, default="draft", server_default="draft")
    admin_comment = Column(Text, nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
