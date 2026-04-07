import uuid

from sqlalchemy import Column, Date, DateTime, ForeignKey, String, Text, Uuid, func
from sqlalchemy.orm import relationship

from app.db.base import Base


class StudentProfile(Base):
    __tablename__ = "student_profiles"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    full_name = Column(String, nullable=False)
    birth_date = Column(Date, nullable=False)
    gender = Column(String, nullable=False)
    grade_label = Column(String, nullable=False)
    enrollment_date = Column(Date, nullable=False)
    quote = Column(Text, nullable=True)
    avatar_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User", back_populates="student_profile")
