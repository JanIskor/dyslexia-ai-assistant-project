"""add adaptation rationale to learning materials

Revision ID: b1c2d3e4f5a6
Revises: a9c4e2f7b1d3
Create Date: 2026-05-13 18:20:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "b1c2d3e4f5a6"
down_revision = "a9c4e2f7b1d3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("learning_materials", sa.Column("adaptation_genre", sa.String(), nullable=True))
    op.add_column("learning_materials", sa.Column("adaptation_rationale", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("learning_materials", "adaptation_rationale")
    op.drop_column("learning_materials", "adaptation_genre")
