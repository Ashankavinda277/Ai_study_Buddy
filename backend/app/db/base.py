from app.db.database import Base
from app.models import Document, DocumentChunk, ChatSession, ChatMessage  # noqa: F401  (registers tables on Base.metadata)

# NOTE: app.models.user.User is Member 2's table and isn't defined yet.
# Import it here once it exists so Alembic autogenerate picks it up.

__all__ = ["Base"]
