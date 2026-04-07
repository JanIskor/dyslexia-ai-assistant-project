import uuid

from sqlalchemy import Boolean, CheckConstraint, Column, DateTime, String, Uuid, func
from sqlalchemy.orm import relationship

from app.db.base import Base


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("role IN ('student', 'teacher')", name="ck_users_role"),
    )

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False, default="student")
    is_active = Column(Boolean, nullable=False, default=True, server_default="true")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    student_profile = relationship("StudentProfile", back_populates="user", uselist=False)
    teacher_profile = relationship("TeacherProfile", back_populates="user", uselist=False)
    teacher_links = relationship(
        "TeacherStudent",
        foreign_keys="TeacherStudent.teacher_user_id",
        back_populates="teacher_user",
    )
    student_links = relationship(
        "TeacherStudent",
        foreign_keys="TeacherStudent.student_user_id",
        back_populates="student_user",
    )
