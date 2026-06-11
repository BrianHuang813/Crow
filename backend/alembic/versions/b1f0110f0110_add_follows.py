"""add follows table

Revision ID: b1f0110f0110
Revises: 560ec278a583
Create Date: 2026-06-10

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "b1f0110f0110"
down_revision: Union[str, None] = "560ec278a583"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "follows",
        sa.Column("follower_id", sa.UUID(), nullable=False),
        sa.Column("followee_id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["follower_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["followee_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("follower_id", "followee_id"),
    )
    op.create_index("ix_follows_followee_id", "follows", ["followee_id"])


def downgrade() -> None:
    op.drop_index("ix_follows_followee_id", table_name="follows")
    op.drop_table("follows")
