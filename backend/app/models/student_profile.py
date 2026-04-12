import uuid

from sqlalchemy import CheckConstraint, Column, Date, DateTime, ForeignKey, String, Text, Uuid, func
from sqlalchemy.orm import relationship

from app.db.base import Base


class StudentProfile(Base):
    __tablename__ = "student_profiles"
    __table_args__ = (
        CheckConstraint(
            "profile_status IN ('draft', 'submitted', 'in_review', 'needs_completion', 'approved', 'teacher_accepted', 'teacher_rejected')",
            name="ck_student_profiles_status",
        ),
    )

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    full_name = Column(String, nullable=True)
    birth_date = Column(Date, nullable=True)
    gender = Column(String, nullable=True)
    grade_label = Column(String, nullable=True)
    enrollment_date = Column(Date, nullable=True)
    quote = Column(Text, nullable=True)
    avatar_url = Column(String, nullable=True)
    profile_status = Column(String, nullable=False, default="draft", server_default="draft")
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User", back_populates="student_profile")
