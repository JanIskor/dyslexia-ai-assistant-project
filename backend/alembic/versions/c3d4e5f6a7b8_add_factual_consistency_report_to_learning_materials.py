"""add factual consistency report to learning materials

Revision ID: c3d4e5f6a7b8
Revises: b1c2d3e4f5a6
Create Date: 2026-05-13 20:10:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "c3d4e5f6a7b8"
down_revision = "b1c2d3e4f5a6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("learning_materials", sa.Column("factual_consistency_report", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("learning_materials", "factual_consistency_report")
