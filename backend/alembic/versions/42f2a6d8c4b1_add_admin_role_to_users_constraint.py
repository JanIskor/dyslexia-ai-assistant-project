"""add admin role to users constraint

Revision ID: 42f2a6d8c4b1
Revises: 4570916bb293
Create Date: 2026-04-09 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "42f2a6d8c4b1"
down_revision: Union[str, Sequence[str], None] = "4570916bb293"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("ck_users_role", "users", type_="check")
    op.create_check_constraint("ck_users_role", "users", "role IN ('student', 'teacher', 'admin')")


def downgrade() -> None:
    op.drop_constraint("ck_users_role", "users", type_="check")
    op.create_check_constraint("ck_users_role", "users", "role IN ('student', 'teacher')")
