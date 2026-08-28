import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.quiz import Quiz
from app.models.quiz_attempt import QuizAttempt
from app.models.quiz_question import QuizQuestion
from app.models.student_answer import StudentAnswer
from app.models.topic_performance import TopicPerformance
from app.models.user import User
from app.schemas.quiz import (
    AvailableDocument,
    QuizGenerateRequest,
    QuizGenerateResponse,
    QuizPublic,
    QuizSubmitRequest,
    QuizSubmitResponse,
)
from app.services import retrieval_client
from app.services.feedback_generator import IncorrectItem, generate_feedback
from app.services.grading import GradableQuestion, GradingResult, SubmittedAnswer, grade_quiz
from app.services.quiz_generator import QuizGenerationError, generate_quiz_content

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/quizzes", tags=["quizzes"])


def _get_owned_quiz(db: Session, quiz_id: int, user_id: int) -> Quiz:
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.user_id == user_id).first()
    if quiz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")
    return quiz


@router.get("/documents", response_model=list[AvailableDocument])
def list_available_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    documents = retrieval_client.list_documents(db, current_user.id)
    return [
        AvailableDocument(id=doc.id, filename=doc.filename, status=doc.status)
        for doc in documents
    ]


@router.post("/generate", response_model=QuizGenerateResponse, status_code=status.HTTP_201_CREATED)
def generate_quiz(
    payload: QuizGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    available_document_ids = {doc.id for doc in retrieval_client.list_documents(db, current_user.id)}
    if payload.document_id not in available_document_ids:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    # Row exists (status="pending") before the AI call so a crash mid-generation
    # still leaves a record we can point at, per the Feature 4 failure flow.
    new_quiz = Quiz(
        user_id=current_user.id,
        document_id=payload.document_id,
        title=payload.topic or "Untitled quiz",
        topic=payload.topic,
        difficulty=payload.difficulty,
        question_count=payload.question_count,
        status="pending",
    )
    db.add(new_quiz)
    db.commit()
    db.refresh(new_quiz)

    try:
        ai_quiz = generate_quiz_content(
            document_id=payload.document_id,
            topic=payload.topic,
            difficulty=payload.difficulty,
            question_count=payload.question_count,
        )
    except QuizGenerationError as e:
        new_quiz.status = "failed"
        db.commit()
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))

    new_quiz.title = ai_quiz.title
    new_quiz.status = "ready"
    for question in ai_quiz.questions:
        db.add(
            QuizQuestion(
                quiz_id=new_quiz.id,
                question=question.question,
                option_a=question.options[0],
                option_b=question.options[1],
                option_c=question.options[2],
                option_d=question.options[3],
                correct_answer=question.correct_answer,
                explanation=question.explanation,
                topic=question.topic,
                difficulty=question.difficulty,
                source_page=question.source_page,
            )
        )
    db.commit()

    return QuizGenerateResponse(quiz_id=new_quiz.id)


@router.get("/{quiz_id}", response_model=QuizPublic)
def get_quiz(
    quiz_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    quiz = _get_owned_quiz(db, quiz_id, current_user.id)
    questions = (
        db.query(QuizQuestion)
        .filter(QuizQuestion.quiz_id == quiz.id)
        .order_by(QuizQuestion.id)
        .all()
    )
    return QuizPublic(
        id=quiz.id,
        title=quiz.title,
        topic=quiz.topic,
        difficulty=quiz.difficulty,
        question_count=quiz.question_count,
        status=quiz.status,
        questions=questions,
    )


def _generate_attempt_feedback(
    quiz: Quiz, questions: list[QuizQuestion], result: GradingResult
) -> str | None:
    """Builds the incorrect-questions-only feedback prompt and calls the AI.

    Never raises: a chunk-retrieval or AI failure here should not fail the
    whole submission, since the score is already graded and saved either way.
    """
    questions_by_id = {q.id: q for q in questions}

    incorrect_items: list[IncorrectItem] = []
    incorrect_topics: list[str] = []
    for question_result in result.question_results:
        if question_result.is_correct:
            continue
        question = questions_by_id[question_result.question_id]
        options = [question.option_a, question.option_b, question.option_c, question.option_d]
        selected = question_result.selected_answer
        incorrect_items.append(
            IncorrectItem(
                question=question.question,
                selected_answer_text=options[selected] if selected is not None else None,
                correct_answer_text=options[question_result.correct_answer],
                explanation=question.explanation,
                topic=question.topic,
            )
        )
        if question.topic:
            incorrect_topics.append(question.topic)

    chunks: list[str] = []
    try:
        if incorrect_items:
            query = ", ".join(dict.fromkeys(incorrect_topics)) or quiz.topic or "overview"
            chunks = [c.text for c in retrieval_client.search_chunks(quiz.document_id, query, top_k=5)]

        return generate_feedback(
            quiz_topic=quiz.topic,
            score_percentage=result.score_percentage,
            performance_level=result.performance_level,
            incorrect_items=incorrect_items,
            chunks=chunks,
        )
    except Exception as e:  # noqa: BLE001 - feedback is enrichment, never blocks grading
        logger.warning("Skipping AI feedback for quiz %s: %s", quiz.id, e)
        return None


def _update_topic_performance(
    db: Session, user_id: int, questions: list[QuizQuestion], result: GradingResult
) -> None:
    """Increments per-topic attempted/correct counts and recomputes accuracy,
    in the same transaction as the submit (Feature 11). Cheaper than
    recalculating from scratch on every dashboard load — each submission
    just adds its own tally to the running total.
    """
    questions_by_id = {q.id: q for q in questions}

    deltas: dict[str, dict[str, int]] = {}
    for question_result in result.question_results:
        topic = questions_by_id[question_result.question_id].topic or "General"
        bucket = deltas.setdefault(topic, {"attempted": 0, "correct": 0})
        bucket["attempted"] += 1
        if question_result.is_correct:
            bucket["correct"] += 1

    for topic, delta in deltas.items():
        row = (
            db.query(TopicPerformance)
            .filter(TopicPerformance.user_id == user_id, TopicPerformance.topic == topic)
            .first()
        )
        if row is None:
            row = TopicPerformance(user_id=user_id, topic=topic, total_attempted=0, total_correct=0)
            db.add(row)

        row.total_attempted += delta["attempted"]
        row.total_correct += delta["correct"]
        row.accuracy = round((row.total_correct / row.total_attempted) * 100, 2)


@router.post("/{quiz_id}/submit", response_model=QuizSubmitResponse)
def submit_quiz(
    quiz_id: int,
    payload: QuizSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    quiz = _get_owned_quiz(db, quiz_id, current_user.id)
    questions = db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz.id).all()
    if not questions:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quiz has no questions")

    gradable_questions = [
        GradableQuestion(id=q.id, correct_answer=q.correct_answer) for q in questions
    ]
    submitted_answers = [
        SubmittedAnswer(question_id=a.question_id, selected_answer=a.selected_answer)
        for a in payload.answers
    ]
    result = grade_quiz(gradable_questions, submitted_answers)

    attempt = QuizAttempt(
        quiz_id=quiz.id,
        user_id=current_user.id,
        correct_count=result.correct_count,
        incorrect_count=result.incorrect_count,
        score_percentage=result.score_percentage,
        time_taken=payload.time_taken,
    )
    db.add(attempt)
    db.flush()

    for question_result in result.question_results:
        db.add(
            StudentAnswer(
                attempt_id=attempt.id,
                question_id=question_result.question_id,
                selected_answer=question_result.selected_answer,
                is_correct=question_result.is_correct,
            )
        )

    attempt.ai_feedback = _generate_attempt_feedback(quiz, questions, result)
    _update_topic_performance(db, current_user.id, questions, result)

    db.commit()

    return QuizSubmitResponse(
        attempt_id=attempt.id,
        correct_count=result.correct_count,
        incorrect_count=result.incorrect_count,
        total_questions=result.total_questions,
        score_percentage=result.score_percentage,
        performance_level=result.performance_level,
    )
