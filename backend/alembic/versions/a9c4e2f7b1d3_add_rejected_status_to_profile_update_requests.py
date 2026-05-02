"""add rejected status to profile update requests

Revision ID: a9c4e2f7b1d3
Revises: f2a1c9d8e7b6
Create Date: 2026-05-02 18:10:00.000000
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = "a9c4e2f7b1d3"
down_revision = "f2a1c9d8e7b6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint(
        "ck_student_profile_update_requests_status",
        "student_profile_update_requests",
        type_="check",
    )
    op.create_check_constraint(
        "ck_student_profile_update_requests_status",
        "student_profile_update_requests",
        "status IN ('draft', 'submitted', 'in_review', 'revision_requested', 'approved', 'rejected')",
    )

    op.drop_constraint(
        "ck_teacher_profile_update_requests_status",
        "teacher_profile_update_requests",
        type_="check",
    )
    op.create_check_constraint(
        "ck_teacher_profile_update_requests_status",
        "teacher_profile_update_requests",
        "status IN ('draft', 'submitted', 'in_review', 'revision_requested', 'approved', 'rejected')",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_teacher_profile_update_requests_status",
        "teacher_profile_update_requests",
        type_="check",
    )
    op.create_check_constraint(
        "ck_teacher_profile_update_requests_status",
        "teacher_profile_update_requests",
        "status IN ('draft', 'submitted', 'in_review', 'revision_requested', 'approved')",
    )

    op.drop_constraint(
        "ck_student_profile_update_requests_status",
        "student_profile_update_requests",
        type_="check",
    )
    op.create_check_constraint(
        "ck_student_profile_update_requests_status",
        "student_profile_update_requests",
        "status IN ('draft', 'submitted', 'in_review', 'revision_requested', 'approved')",
    )
