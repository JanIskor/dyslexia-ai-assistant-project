"""add soft delete to admin applications

Revision ID: f2a1c9d8e7b6
Revises: e4c7b8a9d1f2
Create Date: 2026-05-02 15:40:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "f2a1c9d8e7b6"
down_revision = "e4c7b8a9d1f2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "student_profiles",
        sa.Column("admin_application_deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "student_profile_update_requests",
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "teacher_profile_update_requests",
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("teacher_profile_update_requests", "deleted_at")
    op.drop_column("student_profile_update_requests", "deleted_at")
    op.drop_column("student_profiles", "admin_application_deleted_at")
