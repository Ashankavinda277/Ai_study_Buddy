from app.db.database import Base
from app.models import (  # noqa: F401  (imports register tables on Base.metadata)
    ChatMessage,
    ChatSession,
    Document,
    DocumentChunk,
    Quiz,
    QuizAttempt,
    QuizQuestion,
    StudentAnswer,
    TopicPerformance,
    User,
)
__all__ = ["Base"]
