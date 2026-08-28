from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.sql import func

from app.db.database import Base


class TopicPerformance(Base):
    __tablename__ = "topic_performance"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    topic = Column(String, nullable=False, index=True)
    total_attempted = Column(Integer, nullable=False, default=0)
    total_correct = Column(Integer, nullable=False, default=0)
    accuracy = Column(Float, nullable=False, default=0.0)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
