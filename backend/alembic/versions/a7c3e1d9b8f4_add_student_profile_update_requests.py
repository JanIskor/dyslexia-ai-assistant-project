"""add student profile update requests

Revision ID: a7c3e1d9b8f4
Revises: f2b1a7d3c4e5
Create Date: 2026-04-13 10:30:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "a7c3e1d9b8f4"
down_revision: Union[str, Sequence[str], None] = "f2b1a7d3c4e5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "student_profile_update_requests",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("student_user_id", sa.Uuid(), nullable=False),
        sa.Column("full_name", sa.String(), nullable=True),
        sa.Column("birth_date", sa.Date(), nullable=True),
        sa.Column("gender", sa.String(), nullable=True),
        sa.Column("quote", sa.Text(), nullable=True),
        sa.Column("avatar_url", sa.String(), nullable=True),
        sa.Column("status", sa.String(), server_default="draft", nullable=False),
        sa.Column("admin_comment", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "status IN ('draft', 'submitted', 'in_review', 'revision_requested', 'approved')",
            name="ck_student_profile_update_requests_status",
        ),
        sa.ForeignKeyConstraint(["student_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("student_user_id"),
    )
    op.create_index(
        "ix_student_profile_update_requests_student_user_id",
        "student_profile_update_requests",
        ["student_user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_student_profile_update_requests_student_user_id",
        table_name="student_profile_update_requests",
    )
    op.drop_table("student_profile_update_requests")
