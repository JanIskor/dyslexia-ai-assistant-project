"""expand student profile statuses for admin review

Revision ID: b3b5f788f1a1
Revises: 96d7c6b9b4a2
Create Date: 2026-04-10 00:00:02.000000
"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "b3b5f788f1a1"
down_revision: Union[str, Sequence[str], None] = "96d7c6b9b4a2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("ck_student_profiles_status", "student_profiles", type_="check")
    op.create_check_constraint(
        "ck_student_profiles_status",
        "student_profiles",
        "profile_status IN ('draft', 'submitted', 'in_review', 'needs_completion', 'approved')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_student_profiles_status", "student_profiles", type_="check")
    op.create_check_constraint(
        "ck_student_profiles_status",
        "student_profiles",
        "profile_status IN ('draft', 'submitted')",
    )
