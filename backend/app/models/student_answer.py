from sqlalchemy import Boolean, Column, ForeignKey, Integer

from app.db.database import Base


class StudentAnswer(Base):
    __tablename__ = "student_answers"

    id = Column(Integer, primary_key=True, index=True)
    attempt_id = Column(Integer, ForeignKey("quiz_attempts.id"), nullable=False, index=True)
    question_id = Column(Integer, ForeignKey("quiz_questions.id"), nullable=False, index=True)
    selected_answer = Column(Integer, nullable=True)  # index 0-3; null if left unanswered
    is_correct = Column(Boolean, nullable=False, default=False)
