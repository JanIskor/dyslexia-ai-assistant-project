"""add learning materials table

Revision ID: d4c1e6a8f9b2
Revises: c9d4a6e2f1b7
Create Date: 2026-04-15 12:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = "d4c1e6a8f9b2"
down_revision: Union[str, Sequence[str], None] = "c9d4a6e2f1b7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "learning_materials",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("teacher_user_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("original_text", sa.Text(), nullable=False),
        sa.Column("material_type", sa.String(), server_default="text", nullable=False),
        sa.Column("status", sa.String(), server_default="draft", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["teacher_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_learning_materials_teacher_user_id", "learning_materials", ["teacher_user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_learning_materials_teacher_user_id", table_name="learning_materials")
    op.drop_table("learning_materials")
