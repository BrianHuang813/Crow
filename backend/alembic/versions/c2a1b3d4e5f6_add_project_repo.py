"""add repo column to projects

Revision ID: c2a1b3d4e5f6
Revises: b1f0110f0110
Create Date: 2026-06-16

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "c2a1b3d4e5f6"
down_revision: Union[str, None] = "b1f0110f0110"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("projects", sa.Column("repo", sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column("projects", "repo")
