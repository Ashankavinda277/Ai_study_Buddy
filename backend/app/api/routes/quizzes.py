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
from app.schemas.quiz import (
    AvailableDocument,
    QuizGenerateRequest,
    QuizGenerateResponse,
    QuizPublic,
    QuizSubmitRequest,
    QuizSubmitResponse,
)
from app.services import retrieval_client
from app.services.grading import GradableQuestion, SubmittedAnswer, grade_quiz

router = APIRouter(prefix="/quizzes", tags=["quizzes"])

# Title of the hand-written quiz created by scripts/seed_quiz.py. Until real
# AI generation (Feature 3) exists, /quizzes/generate clones this quiz's
# questions so the configuration form and its loading/error states can be
# built and tested end-to-end.
SEED_QUIZ_TITLE = "Sample Quiz: Database Basics"


def _get_owned_quiz(db: Session, quiz_id: int, user_id: int) -> Quiz:
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.user_id == user_id).first()
    if quiz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")
    return quiz


def _get_or_create_stub_document(db: Session) -> Document:
    """Temporary document row so a generated Quiz can satisfy the
    Quiz.document_id foreign key.

    retrieval_client returns fake document ids that don't exist in the
    real `documents` table yet, so we can't use them directly as the FK
    value. This reuses the same placeholder row scripts/seed_quiz.py
    creates. Once retrieval_client is wired up to Member 1's real
    document endpoints, generated quizzes will point at real document
    rows and this helper goes away.
    """
    document = db.query(Document).filter(Document.filename == "seed-document.txt").first()
    if document is None:
        document = Document(
            filename="seed-document.txt", filepath="seed", status="ready", size_bytes=0
        )
        db.add(document)
        db.flush()
    return document


@router.get("/documents", response_model=list[AvailableDocument])
def list_available_documents(current_user: User = Depends(get_current_user)):
    documents = retrieval_client.list_documents(current_user.id)
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
    available_document_ids = {doc.id for doc in retrieval_client.list_documents(current_user.id)}
    if payload.document_id not in available_document_ids:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    # No AI yet (that's Feature 3). For now, clone the seeded quiz's
    # questions so this form and its loading/error states can be tested
    # end-to-end without depending on Member 1 or an LLM being ready.
    source_quiz = db.query(Quiz).filter(Quiz.title == SEED_QUIZ_TITLE).order_by(Quiz.id).first()
    if source_quiz is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No seed quiz found to clone. Run `python -m scripts.seed_quiz` first.",
        )
    source_questions = (
        db.query(QuizQuestion)
        .filter(QuizQuestion.quiz_id == source_quiz.id)
        .order_by(QuizQuestion.id)
        .all()
    )

    document = _get_or_create_stub_document(db)

    new_quiz = Quiz(
        user_id=current_user.id,
        document_id=document.id,
        title=f"{payload.topic or 'Quiz'} ({payload.difficulty.title()})",
        topic=payload.topic,
        difficulty=payload.difficulty,
        question_count=payload.question_count,
        status="ready",
    )
    db.add(new_quiz)
    db.flush()

    # Cycle through the seed questions to fill the requested count.
    for i in range(payload.question_count):
        source = source_questions[i % len(source_questions)]
        db.add(
            QuizQuestion(
                quiz_id=new_quiz.id,
                question=source.question,
                option_a=source.option_a,
                option_b=source.option_b,
                option_c=source.option_c,
                option_d=source.option_d,
                correct_answer=source.correct_answer,
                explanation=source.explanation,
                topic=source.topic,
                difficulty=payload.difficulty,
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

    db.commit()

    return QuizSubmitResponse(
        attempt_id=attempt.id,
        correct_count=result.correct_count,
        incorrect_count=result.incorrect_count,
        total_questions=result.total_questions,
        score_percentage=result.score_percentage,
        performance_level=result.performance_level,
    )
