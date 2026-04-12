"""add teacher student messages

Revision ID: f2b1a7d3c4e5
Revises: eb4e7a1c9d2f
Create Date: 2026-04-12 15:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "f2b1a7d3c4e5"
down_revision: Union[str, Sequence[str], None] = "eb4e7a1c9d2f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "teacher_student_messages",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("teacher_user_id", sa.Uuid(), nullable=False),
        sa.Column("student_user_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("is_read_by_student", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["student_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["teacher_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_teacher_student_messages_student_user_id",
        "teacher_student_messages",
        ["student_user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_teacher_student_messages_student_user_id", table_name="teacher_student_messages")
    op.drop_table("teacher_student_messages")
