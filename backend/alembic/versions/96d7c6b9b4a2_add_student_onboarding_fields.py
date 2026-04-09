"""add student onboarding fields

Revision ID: 96d7c6b9b4a2
Revises: 42f2a6d8c4b1
Create Date: 2026-04-09 00:00:01.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "96d7c6b9b4a2"
down_revision: Union[str, Sequence[str], None] = "42f2a6d8c4b1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "student_profiles",
        sa.Column("profile_status", sa.String(), nullable=False, server_default="draft"),
    )
    op.add_column(
        "student_profiles",
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.alter_column("student_profiles", "full_name", existing_type=sa.String(), nullable=True)
    op.alter_column("student_profiles", "birth_date", existing_type=sa.Date(), nullable=True)
    op.alter_column("student_profiles", "gender", existing_type=sa.String(), nullable=True)
    op.alter_column("student_profiles", "grade_label", existing_type=sa.String(), nullable=True)
    op.alter_column("student_profiles", "enrollment_date", existing_type=sa.Date(), nullable=True)
    op.create_check_constraint(
        "ck_student_profiles_status",
        "student_profiles",
        "profile_status IN ('draft', 'submitted')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_student_profiles_status", "student_profiles", type_="check")
    op.alter_column("student_profiles", "enrollment_date", existing_type=sa.Date(), nullable=False)
    op.alter_column("student_profiles", "grade_label", existing_type=sa.String(), nullable=False)
    op.alter_column("student_profiles", "gender", existing_type=sa.String(), nullable=False)
    op.alter_column("student_profiles", "birth_date", existing_type=sa.Date(), nullable=False)
    op.alter_column("student_profiles", "full_name", existing_type=sa.String(), nullable=False)
    op.drop_column("student_profiles", "submitted_at")
    op.drop_column("student_profiles", "profile_status")
