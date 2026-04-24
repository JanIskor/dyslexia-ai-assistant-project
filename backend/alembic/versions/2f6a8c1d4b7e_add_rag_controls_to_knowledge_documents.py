"""add rag controls to knowledge documents

Revision ID: 2f6a8c1d4b7e
Revises: c4d8e2f1b7a3
Create Date: 2026-04-24 19:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "2f6a8c1d4b7e"
down_revision = "f1a9c3d4e5b6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "knowledge_documents",
        sa.Column("use_in_rag", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.add_column(
        "knowledge_documents",
        sa.Column(
            "adaptation_modes",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
    )


def downgrade() -> None:
    op.drop_column("knowledge_documents", "adaptation_modes")
    op.drop_column("knowledge_documents", "use_in_rag")
