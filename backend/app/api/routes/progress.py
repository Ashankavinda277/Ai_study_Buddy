from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.document import Document
from app.models.quiz import Quiz
from app.models.quiz_attempt import QuizAttempt
from app.models.topic_performance import TopicPerformance
from app.models.user import User
from app.schemas.progress import (
    DifficultyPerformance,
    ProgressSummary,
    ScoreTrendPoint,
    TopicPerformanceOut,
)
from app.schemas.quiz import AttemptSummary
from app.services.grading import performance_level
from app.services.topic_classification import classify_topic

router = APIRouter(prefix="/progress", tags=["progress"])

RECENT_ATTEMPTS_LIMIT = 5
SCORE_TREND_LIMIT = 20


@router.get("/summary", response_model=ProgressSummary)
def get_progress_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    attempts = (
        db.query(QuizAttempt)
        .filter(QuizAttempt.user_id == current_user.id)
        .order_by(QuizAttempt.completed_at.desc(), QuizAttempt.id.desc())
        .all()
    )

    if not attempts:
        return ProgressSummary(
            total_quizzes_completed=0,
            average_score=0.0,
            best_score=0.0,
            recent_score=None,
            total_questions_answered=0,
            correct_answer_percentage=0.0,
            strongest_topic=None,
            weakest_topic=None,
            performance_by_difficulty=[],
            recent_attempts=[],
            score_trend=[],
        )

    total_quizzes = len(attempts)
    average_score = round(sum(a.score_percentage for a in attempts) / total_quizzes, 2)
    best_score = max(a.score_percentage for a in attempts)
    recent_score = attempts[0].score_percentage
    total_questions_answered = sum(a.correct_count + a.incorrect_count for a in attempts)
    total_correct = sum(a.correct_count for a in attempts)
    correct_answer_percentage = (
        round((total_correct / total_questions_answered) * 100, 2) if total_questions_answered else 0.0
    )

    topics = (
        db.query(TopicPerformance)
        .filter(TopicPerformance.user_id == current_user.id, TopicPerformance.total_attempted > 0)
        .all()
    )
    strongest_topic = max(topics, key=lambda t: t.accuracy).topic if topics else None
    weakest_topic = min(topics, key=lambda t: t.accuracy).topic if topics else None

    difficulty_rows = (
        db.query(Quiz.difficulty, func.count(QuizAttempt.id), func.avg(QuizAttempt.score_percentage))
        .join(QuizAttempt, QuizAttempt.quiz_id == Quiz.id)
        .filter(QuizAttempt.user_id == current_user.id)
        .group_by(Quiz.difficulty)
        .all()
    )
    performance_by_difficulty = [
        DifficultyPerformance(difficulty=difficulty, attempts=count, average_score=round(float(avg), 2))
        for difficulty, count, avg in difficulty_rows
    ]

    recent_rows = (
        db.query(QuizAttempt, Quiz, Document)
        .join(Quiz, QuizAttempt.quiz_id == Quiz.id)
        .join(Document, Quiz.document_id == Document.id)
        .filter(QuizAttempt.user_id == current_user.id)
        .order_by(QuizAttempt.completed_at.desc(), QuizAttempt.id.desc())
        .limit(RECENT_ATTEMPTS_LIMIT)
        .all()
    )
    recent_attempts = [
        AttemptSummary(
            id=attempt.id,
            quiz_id=quiz.id,
            quiz_title=quiz.title,
            document_filename=document.filename,
            topic=quiz.topic,
            difficulty=quiz.difficulty,
            score_percentage=attempt.score_percentage,
            performance_level=performance_level(attempt.score_percentage),
            time_taken=attempt.time_taken,
            completed_at=attempt.completed_at,
        )
        for attempt, quiz, document in recent_rows
    ]

    # oldest -> newest, so a line chart reads left to right as "over time"
    trend_source = list(reversed(attempts[:SCORE_TREND_LIMIT]))
    score_trend = [
        ScoreTrendPoint(attempt_id=a.id, completed_at=a.completed_at, score_percentage=a.score_percentage)
        for a in trend_source
    ]

    return ProgressSummary(
        total_quizzes_completed=total_quizzes,
        average_score=average_score,
        best_score=best_score,
        recent_score=recent_score,
        total_questions_answered=total_questions_answered,
        correct_answer_percentage=correct_answer_percentage,
        strongest_topic=strongest_topic,
        weakest_topic=weakest_topic,
        performance_by_difficulty=performance_by_difficulty,
        recent_attempts=recent_attempts,
        score_trend=score_trend,
    )


@router.get("/topics", response_model=list[TopicPerformanceOut])
def get_topic_performance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    topics = (
        db.query(TopicPerformance)
        .filter(TopicPerformance.user_id == current_user.id, TopicPerformance.total_attempted > 0)
        .order_by(TopicPerformance.accuracy.asc())
        .all()
    )
    return [
        TopicPerformanceOut(
            topic=t.topic,
            total_attempted=t.total_attempted,
            total_correct=t.total_correct,
            accuracy=t.accuracy,
            classification=classify_topic(t.accuracy),
            updated_at=t.updated_at,
        )
        for t in topics
    ]
