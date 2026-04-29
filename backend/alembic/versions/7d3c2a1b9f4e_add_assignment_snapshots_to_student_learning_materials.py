"""add assignment snapshots to student learning materials

Revision ID: 7d3c2a1b9f4e
Revises: 2f6a8c1d4b7e
Create Date: 2026-04-24 22:10:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "7d3c2a1b9f4e"
down_revision = "2f6a8c1d4b7e"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("student_learning_materials", sa.Column("assigned_title", sa.String(), nullable=True))
    op.add_column("student_learning_materials", sa.Column("assigned_text", sa.Text(), nullable=True))
    op.add_column(
        "student_learning_materials",
        sa.Column("assigned_adaptation_mode", sa.String(), nullable=True),
    )
    op.add_column(
        "student_learning_materials",
        sa.Column("assigned_is_adapted", sa.Boolean(), nullable=True),
    )

    op.execute(
        """
        UPDATE student_learning_materials AS assignment
        SET
            assigned_title = material.title,
            assigned_text = COALESCE(material.adapted_text, material.original_text),
            assigned_adaptation_mode = material.adaptation_mode,
            assigned_is_adapted = CASE
                WHEN material.adapted_text IS NOT NULL THEN TRUE
                ELSE FALSE
            END
        FROM learning_materials AS material
        WHERE material.id = assignment.learning_material_id
        """
    )


def downgrade() -> None:
    op.drop_column("student_learning_materials", "assigned_is_adapted")
    op.drop_column("student_learning_materials", "assigned_adaptation_mode")
    op.drop_column("student_learning_materials", "assigned_text")
    op.drop_column("student_learning_materials", "assigned_title")
