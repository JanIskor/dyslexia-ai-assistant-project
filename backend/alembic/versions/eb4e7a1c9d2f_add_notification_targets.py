"""add notification targets

Revision ID: eb4e7a1c9d2f
Revises: c2f5e9d7a1b4
Create Date: 2026-04-12 12:40:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = "eb4e7a1c9d2f"
down_revision: Union[str, Sequence[str], None] = "c2f5e9d7a1b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("notifications", sa.Column("target_view", sa.String(), nullable=True))
    op.add_column("notifications", sa.Column("action_key", sa.String(), nullable=True))
    op.add_column("notifications", sa.Column("target_id", sa.Uuid(), nullable=True))


def downgrade() -> None:
    op.drop_column("notifications", "target_id")
    op.drop_column("notifications", "action_key")
    op.drop_column("notifications", "target_view")
