"""merge user auth and document/chat migrations

Revision ID: 5f470fd65eb3
Revises: e49276d6ea4e, c9fd6bb73069
Create Date: 2026-08-28 13:23:55.458069

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5f470fd65eb3'
down_revision: Union[str, Sequence[str], None] = ('e49276d6ea4e', 'c9fd6bb73069')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
