from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, Text
from sqlalchemy.sql import func

from app.db.database import Base


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    correct_count = Column(Integer, nullable=False, default=0)
    incorrect_count = Column(Integer, nullable=False, default=0)
    score_percentage = Column(Float, nullable=False, default=0.0)
    time_taken = Column(Integer, nullable=True)  # seconds; optional timer feature
    ai_feedback = Column(Text, nullable=True)
    completed_at = Column(DateTime(timezone=True), server_default=func.now())
