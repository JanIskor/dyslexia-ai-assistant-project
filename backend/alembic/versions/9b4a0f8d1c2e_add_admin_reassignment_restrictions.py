"""add admin reassignment restriction state

Revision ID: 9b4a0f8d1c2e
Revises: 73ebec191d1f
Create Date: 2026-04-12 00:00:01.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = "9b4a0f8d1c2e"
down_revision: Union[str, Sequence[str], None] = "73ebec191d1f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("student_profiles", sa.Column("current_teacher_user_id", sa.Uuid(), nullable=True))
    op.add_column("student_profiles", sa.Column("teacher_review_status", sa.String(), nullable=True))
    op.create_foreign_key(
        "fk_student_profiles_current_teacher_user_id",
        "student_profiles",
        "users",
        ["current_teacher_user_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_check_constraint(
        "ck_student_profiles_teacher_review_status",
        "student_profiles",
        "teacher_review_status IS NULL OR teacher_review_status IN ('pending', 'accepted', 'rejected')",
    )

    op.create_table(
        "teacher_student_rejections",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("teacher_user_id", sa.Uuid(), nullable=False),
        sa.Column("student_user_id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("teacher_user_id <> student_user_id", name="ck_teacher_student_rejections_distinct_users"),
        sa.ForeignKeyConstraint(["student_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["teacher_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("teacher_user_id", "student_user_id", name="uq_teacher_student_rejections_teacher_student"),
    )

    op.execute(
        """
        UPDATE student_profiles
        SET current_teacher_user_id = teacher_students.teacher_user_id,
            teacher_review_status = CASE
                WHEN student_profiles.profile_status = 'teacher_accepted' THEN 'accepted'
                ELSE 'pending'
            END
        FROM teacher_students
        WHERE teacher_students.student_user_id = student_profiles.user_id
          AND student_profiles.profile_status IN ('approved', 'teacher_accepted')
        """
    )

    op.execute(
        """
        UPDATE student_profiles
        SET teacher_review_status = 'rejected'
        WHERE profile_status = 'teacher_rejected'
          AND teacher_review_status IS NULL
        """
    )


def downgrade() -> None:
    op.drop_table("teacher_student_rejections")
    op.drop_constraint("ck_student_profiles_teacher_review_status", "student_profiles", type_="check")
    op.drop_constraint("fk_student_profiles_current_teacher_user_id", "student_profiles", type_="foreignkey")
    op.drop_column("student_profiles", "teacher_review_status")
    op.drop_column("student_profiles", "current_teacher_user_id")
