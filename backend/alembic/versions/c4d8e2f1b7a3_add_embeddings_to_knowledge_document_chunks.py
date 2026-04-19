"""add embeddings to knowledge document chunks

Revision ID: c4d8e2f1b7a3
Revises: 8f3e4b2c1d7a
Create Date: 2026-04-19 00:20:00.000000
"""

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector


# revision identifiers, used by Alembic.
revision = "c4d8e2f1b7a3"
down_revision = "8f3e4b2c1d7a"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.add_column(
        "knowledge_document_chunks",
        sa.Column("embedding", Vector(384), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("knowledge_document_chunks", "embedding")
