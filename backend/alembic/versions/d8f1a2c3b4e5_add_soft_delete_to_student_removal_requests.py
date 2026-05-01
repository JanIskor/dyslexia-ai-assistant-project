"""add soft delete to student removal requests

Revision ID: d8f1a2c3b4e5
Revises: b7e4c2d1a9f8
Create Date: 2026-05-01 12:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "d8f1a2c3b4e5"
down_revision = "b7e4c2d1a9f8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "student_teacher_removal_requests",
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("student_teacher_removal_requests", "deleted_at")
