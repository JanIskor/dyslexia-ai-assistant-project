"""add teacher profile update requests

Revision ID: c9d4a6e2f1b7
Revises: a7c3e1d9b8f4
Create Date: 2026-04-13 13:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c9d4a6e2f1b7"
down_revision: Union[str, None] = "a7c3e1d9b8f4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "teacher_profile_update_requests",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("teacher_user_id", sa.Uuid(), nullable=False),
        sa.Column("full_name", sa.String(), nullable=True),
        sa.Column("birth_date", sa.Date(), nullable=True),
        sa.Column("gender", sa.String(), nullable=True),
        sa.Column("position", sa.String(), nullable=True),
        sa.Column("phone", sa.String(), nullable=True),
        sa.Column("work_email", sa.String(), nullable=True),
        sa.Column("subject_name", sa.String(), nullable=True),
        sa.Column("avatar_url", sa.String(), nullable=True),
        sa.Column("status", sa.String(), server_default="draft", nullable=False),
        sa.Column("admin_comment", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "status IN ('draft', 'submitted', 'in_review', 'revision_requested', 'approved')",
            name="ck_teacher_profile_update_requests_status",
        ),
        sa.ForeignKeyConstraint(["teacher_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_teacher_profile_update_requests_teacher_user_id"),
        "teacher_profile_update_requests",
        ["teacher_user_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_teacher_profile_update_requests_teacher_user_id"), table_name="teacher_profile_update_requests")
    op.drop_table("teacher_profile_update_requests")
