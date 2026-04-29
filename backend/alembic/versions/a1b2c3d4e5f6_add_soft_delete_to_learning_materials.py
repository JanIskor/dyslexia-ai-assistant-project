"""add soft delete to learning materials

Revision ID: a1b2c3d4e5f6
Revises: 7d3c2a1b9f4e
Create Date: 2026-04-29 13:10:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "a1b2c3d4e5f6"
down_revision = "7d3c2a1b9f4e"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("learning_materials", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("learning_materials", "deleted_at")
