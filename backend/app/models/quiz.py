from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.sql import func

from app.db.database import Base


class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    document_id = Column(String, ForeignKey("documents.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    topic = Column(String, nullable=True)
    difficulty = Column(String, nullable=False)  # easy, medium, hard
    question_count = Column(Integer, nullable=False)
    status = Column(String, nullable=False, default="pending")  # pending, ready, failed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
