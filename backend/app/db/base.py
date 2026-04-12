from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

# Import models so Alembic sees the full metadata graph.
from app.models import notification, student_profile, teacher_profile, teacher_student, teacher_student_message, teacher_student_rejection, user  # noqa: E402,F401
