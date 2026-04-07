from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

# Import models so Alembic sees the full metadata graph.
from app.models import student_profile, teacher_profile, teacher_student, user  # noqa: E402,F401
