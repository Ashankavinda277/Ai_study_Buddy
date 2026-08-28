from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.schemas.quiz import AttemptSummary


class TopicPerformanceOut(BaseModel):
    topic: str
    total_attempted: int
    total_correct: int
    accuracy: float
    classification: Literal["Strong", "Average", "Weak"]
    updated_at: datetime


class DifficultyPerformance(BaseModel):
    difficulty: str
    attempts: int
    average_score: float


class ScoreTrendPoint(BaseModel):
    attempt_id: int
    completed_at: datetime
    score_percentage: float


class ProgressSummary(BaseModel):
    total_quizzes_completed: int
    average_score: float
    best_score: float
    recent_score: float | None
    total_questions_answered: int
    correct_answer_percentage: float
    strongest_topic: str | None
    weakest_topic: str | None
    performance_by_difficulty: list[DifficultyPerformance]
    recent_attempts: list[AttemptSummary]
    score_trend: list[ScoreTrendPoint]
