"""add student learning materials table

Revision ID: e5b7a4c2d9f1
Revises: d4c1e6a8f9b2
Create Date: 2026-04-15 13:20:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = "e5b7a4c2d9f1"
down_revision: Union[str, Sequence[str], None] = "d4c1e6a8f9b2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "student_learning_materials",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("student_user_id", sa.Uuid(), nullable=False),
        sa.Column("learning_material_id", sa.Uuid(), nullable=False),
        sa.Column("assigned_by_teacher_user_id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["assigned_by_teacher_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["learning_material_id"], ["learning_materials.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["student_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "student_user_id",
            "learning_material_id",
            name="uq_student_learning_materials_student_material",
        ),
    )
    op.create_index(
        "ix_student_learning_materials_learning_material_id",
        "student_learning_materials",
        ["learning_material_id"],
        unique=False,
    )
    op.create_index(
        "ix_student_learning_materials_student_user_id",
        "student_learning_materials",
        ["student_user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_student_learning_materials_student_user_id",
        table_name="student_learning_materials",
    )
    op.drop_index(
        "ix_student_learning_materials_learning_material_id",
        table_name="student_learning_materials",
    )
    op.drop_table("student_learning_materials")
