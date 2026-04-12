"""add teacher incoming review statuses

Revision ID: 73ebec191d1f
Revises: b3b5f788f1a1
Create Date: 2026-04-12 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "73ebec191d1f"
down_revision: Union[str, Sequence[str], None] = "b3b5f788f1a1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("ck_student_profiles_status", "student_profiles", type_="check")
    op.create_check_constraint(
        "ck_student_profiles_status",
        "student_profiles",
        "profile_status IN ('draft', 'submitted', 'in_review', 'needs_completion', 'approved', 'teacher_accepted', 'teacher_rejected')",
    )

    op.execute(
        """
        UPDATE student_profiles
        SET profile_status = 'teacher_accepted'
        WHERE profile_status = 'approved'
          AND EXISTS (
            SELECT 1
            FROM teacher_students
            WHERE teacher_students.student_user_id = student_profiles.user_id
          )
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE student_profiles
        SET profile_status = 'approved'
        WHERE profile_status IN ('teacher_accepted', 'teacher_rejected')
        """
    )

    op.drop_constraint("ck_student_profiles_status", "student_profiles", type_="check")
    op.create_check_constraint(
        "ck_student_profiles_status",
        "student_profiles",
        "profile_status IN ('draft', 'submitted', 'in_review', 'needs_completion', 'approved')",
    )
