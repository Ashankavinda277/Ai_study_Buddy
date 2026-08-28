from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.document import Document
from app.models.quiz import Quiz
from app.models.quiz_attempt import QuizAttempt
from app.models.quiz_question import QuizQuestion
from app.models.student_answer import StudentAnswer
from app.models.user import User
from app.schemas.quiz import AttemptDetail, AttemptSummary, QuestionReview
from app.services.grading import performance_level

router = APIRouter(prefix="/attempts", tags=["attempts"])


@router.get("", response_model=list[AttemptSummary])
def list_attempts(
    document_id: str | None = None,
    topic: str | None = None,
    difficulty: Literal["easy", "medium", "hard"] | None = None,
    sort: Literal["newest", "oldest", "score"] = "newest",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        db.query(QuizAttempt, Quiz, Document)
        .join(Quiz, QuizAttempt.quiz_id == Quiz.id)
        .join(Document, Quiz.document_id == Document.id)
        .filter(QuizAttempt.user_id == current_user.id)
    )

    if document_id:
        query = query.filter(Quiz.document_id == document_id)
    if topic:
        query = query.filter(Quiz.topic.ilike(f"%{topic}%"))
    if difficulty:
        query = query.filter(Quiz.difficulty == difficulty)

    # completed_at alone isn't a reliable tiebreaker for attempts submitted
    # within the same second, so every ordering falls back to id.
    if sort == "oldest":
        query = query.order_by(QuizAttempt.completed_at.asc(), QuizAttempt.id.asc())
    elif sort == "score":
        query = query.order_by(QuizAttempt.score_percentage.desc(), QuizAttempt.id.desc())
    else:
        query = query.order_by(QuizAttempt.completed_at.desc(), QuizAttempt.id.desc())

    return [
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
        for attempt, quiz, document in query.all()
    ]


@router.get("/{attempt_id}", response_model=AttemptDetail)
def get_attempt(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    attempt = (
        db.query(QuizAttempt)
        .filter(QuizAttempt.id == attempt_id, QuizAttempt.user_id == current_user.id)
        .first()
    )
    if attempt is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found")

    quiz = db.query(Quiz).filter(Quiz.id == attempt.quiz_id).first()

    student_answers = (
        db.query(StudentAnswer).filter(StudentAnswer.attempt_id == attempt.id).all()
    )
    questions_by_id = {
        q.id: q
        for q in db.query(QuizQuestion).filter(QuizQuestion.quiz_id == attempt.quiz_id).all()
    }

    question_reviews = [
        QuestionReview(
            question_id=answer.question_id,
            question=(question := questions_by_id[answer.question_id]).question,
            option_a=question.option_a,
            option_b=question.option_b,
            option_c=question.option_c,
            option_d=question.option_d,
            selected_answer=answer.selected_answer,
            correct_answer=question.correct_answer,
            is_correct=answer.is_correct,
            explanation=question.explanation,
            topic=question.topic,
            source_page=question.source_page,
        )
        for answer in sorted(student_answers, key=lambda a: a.question_id)
    ]

    return AttemptDetail(
        id=attempt.id,
        quiz_id=attempt.quiz_id,
        quiz_title=quiz.title,
        correct_count=attempt.correct_count,
        incorrect_count=attempt.incorrect_count,
        total_questions=len(student_answers),
        score_percentage=attempt.score_percentage,
        performance_level=performance_level(attempt.score_percentage),
        time_taken=attempt.time_taken,
        ai_feedback=attempt.ai_feedback,
        completed_at=attempt.completed_at,
        questions=question_reviews,
    )
