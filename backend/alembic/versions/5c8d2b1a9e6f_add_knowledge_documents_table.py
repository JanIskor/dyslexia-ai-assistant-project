"""add knowledge documents table

Revision ID: 5c8d2b1a9e6f
Revises: e5b7a4c2d9f1
Create Date: 2026-04-17 15:20:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "5c8d2b1a9e6f"
down_revision = "e5b7a4c2d9f1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "knowledge_documents",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("original_filename", sa.String(), nullable=False),
        sa.Column("mime_type", sa.String(), nullable=False),
        sa.Column("file_size", sa.BigInteger(), nullable=False),
        sa.Column("storage_object_key", sa.String(), nullable=False),
        sa.Column("uploaded_by_user_id", sa.Uuid(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="uploaded"),
        sa.Column("extracted_text", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["uploaded_by_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("storage_object_key"),
    )
    op.create_index(
        "ix_knowledge_documents_uploaded_by_user_id",
        "knowledge_documents",
        ["uploaded_by_user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_knowledge_documents_uploaded_by_user_id", table_name="knowledge_documents")
    op.drop_table("knowledge_documents")
