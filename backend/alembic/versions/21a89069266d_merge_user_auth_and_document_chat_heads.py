"""merge user_auth and document_chat heads

Revision ID: 21a89069266d
Revises: c9fd6bb73069, e49276d6ea4e
Create Date: 2026-08-28 13:41:50.295134

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '21a89069266d'
down_revision: Union[str, Sequence[str], None] = ('c9fd6bb73069', 'e49276d6ea4e')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
