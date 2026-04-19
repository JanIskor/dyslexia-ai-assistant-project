"""add knowledge document chunks table

Revision ID: 8f3e4b2c1d7a
Revises: 5c8d2b1a9e6f
Create Date: 2026-04-19 12:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "8f3e4b2c1d7a"
down_revision = "5c8d2b1a9e6f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "knowledge_document_chunks",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("document_id", sa.Uuid(), nullable=False),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("char_count", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["document_id"], ["knowledge_documents.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_knowledge_document_chunks_document_id",
        "knowledge_document_chunks",
        ["document_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_knowledge_document_chunks_document_id", table_name="knowledge_document_chunks")
    op.drop_table("knowledge_document_chunks")
