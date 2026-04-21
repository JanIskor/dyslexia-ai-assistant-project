"""add source aware fields to learning materials

Revision ID: f1a9c3d4e5b6
Revises: c4d8e2f1b7a3
Create Date: 2026-04-21 19:20:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "f1a9c3d4e5b6"
down_revision = "c4d8e2f1b7a3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("learning_materials", sa.Column("adapted_text", sa.Text(), nullable=True))
    op.add_column("learning_materials", sa.Column("source_type", sa.String(), nullable=True))
    op.add_column("learning_materials", sa.Column("source_material_id", sa.Uuid(), nullable=True))
    op.add_column("learning_materials", sa.Column("source_filename", sa.String(), nullable=True))
    op.add_column("learning_materials", sa.Column("adaptation_mode", sa.String(), nullable=True))
    op.create_foreign_key(
        "fk_learning_materials_source_material_id",
        "learning_materials",
        "learning_materials",
        ["source_material_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_learning_materials_source_material_id", "learning_materials", type_="foreignkey")
    op.drop_column("learning_materials", "adaptation_mode")
    op.drop_column("learning_materials", "source_filename")
    op.drop_column("learning_materials", "source_material_id")
    op.drop_column("learning_materials", "source_type")
    op.drop_column("learning_materials", "adapted_text")
