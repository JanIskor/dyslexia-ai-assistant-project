from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

# Import models so Alembic sees the full metadata graph.
from app.models import knowledge_document, learning_material, notification, student_learning_material, student_profile, student_profile_update_request, teacher_profile, teacher_profile_update_request, teacher_student, teacher_student_message, teacher_student_rejection, user  # noqa: E402,F401
