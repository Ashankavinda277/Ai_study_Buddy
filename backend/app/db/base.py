from app.db.database import Base
from app.models import Document, DocumentChunk, ChatSession, ChatMessage, User  # noqa: F401  (registers tables on Base.metadata)

__all__ = ["Base"]
