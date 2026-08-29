"""merge quiz tables with document_chat merge head

Revision ID: 9201e6102c74
Revises: 21a89069266d, e0629574ed54
Create Date: 2026-08-29 09:28:48.684967

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9201e6102c74'
down_revision: Union[str, Sequence[str], None] = ('21a89069266d', 'e0629574ed54')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
