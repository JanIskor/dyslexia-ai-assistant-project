"""add needs assignment student status

Revision ID: e4c7b8a9d1f2
Revises: d8f1a2c3b4e5, a1b2c3d4e5f6
Create Date: 2026-05-02 11:00:00.000000
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = "e4c7b8a9d1f2"
down_revision = ("d8f1a2c3b4e5", "a1b2c3d4e5f6")
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint("ck_student_profiles_status", "student_profiles", type_="check")
    op.create_check_constraint(
        "ck_student_profiles_status",
        "student_profiles",
        "profile_status IN ('draft', 'submitted', 'in_review', 'needs_completion', 'approved', 'needs_assignment', 'teacher_accepted', 'teacher_rejected')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_student_profiles_status", "student_profiles", type_="check")
    op.create_check_constraint(
        "ck_student_profiles_status",
        "student_profiles",
        "profile_status IN ('draft', 'submitted', 'in_review', 'needs_completion', 'approved', 'teacher_accepted', 'teacher_rejected')",
    )
