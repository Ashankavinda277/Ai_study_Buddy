"""Seed one hand-written 5-question quiz for local testing of the quiz
player and grading (no AI involved). Safe to re-run: if the seed quiz
already exists it just prints its id instead of duplicating it.

Usage (from the backend/ directory, with the venv activated):
    python -m scripts.seed_quiz
"""

from app.core.security import hash_password
from app.db.database import SessionLocal
from app.models.document import Document
from app.models.quiz import Quiz
from app.models.quiz_question import QuizQuestion
from app.models.user import User

SEED_EMAIL = "seed@example.com"
SEED_PASSWORD = "password123"
QUIZ_TITLE = "Sample Quiz: Database Basics"

QUESTIONS = [
    {
        "question": "What is the main purpose of normalization in a database?",
        "options": [
            "Increase data duplication",
            "Reduce data redundancy",
            "Delete all relationships",
            "Increase table size",
        ],
        "correct_answer": 1,
        "explanation": "Normalization organizes data to reduce redundancy and improve integrity.",
        "topic": "Normalization",
    },
    {
        "question": "Which SQL keyword removes duplicate rows from a result set?",
        "options": ["UNIQUE", "DISTINCT", "FILTER", "GROUP"],
        "correct_answer": 1,
        "explanation": "DISTINCT removes duplicate rows from a SELECT result.",
        "topic": "SQL Basics",
    },
    {
        "question": "What does a PRIMARY KEY constraint guarantee?",
        "options": [
            "Values can repeat",
            "Values are unique and not null",
            "Values are always text",
            "Values are optional",
        ],
        "correct_answer": 1,
        "explanation": "A primary key uniquely identifies each row and cannot be null.",
        "topic": "Keys",
    },
    {
        "question": "Which SQL join returns only rows that match in both tables?",
        "options": ["LEFT JOIN", "RIGHT JOIN", "INNER JOIN", "FULL OUTER JOIN"],
        "correct_answer": 2,
        "explanation": "INNER JOIN returns only rows that match in both tables.",
        "topic": "Joins",
    },
    {
        "question": "What is a foreign key used for?",
        "options": [
            "Encrypting a column",
            "Linking a row to a row in another table",
            "Sorting query results",
            "Indexing text search",
        ],
        "correct_answer": 1,
        "explanation": "A foreign key references the primary key of another table to link related rows.",
        "topic": "Keys",
    },
]


def get_or_create_user(db):
    user = db.query(User).filter(User.email == SEED_EMAIL).first()
    if user:
        return user
    user = User(name="Seed Student", email=SEED_EMAIL, password_hash=hash_password(SEED_PASSWORD))
    db.add(user)
    db.flush()
    return user


def get_or_create_document(db):
    document = db.query(Document).filter(Document.filename == "seed-document.txt").first()
    if document:
        return document
    document = Document(filename="seed-document.txt", filepath="seed", status="ready", size_bytes=0)
    db.add(document)
    db.flush()
    return document


def seed():
    db = SessionLocal()
    try:
        user = get_or_create_user(db)
        document = get_or_create_document(db)

        existing = (
            db.query(Quiz).filter(Quiz.user_id == user.id, Quiz.title == QUIZ_TITLE).first()
        )
        if existing:
            print(f"Seed quiz already exists: quiz_id={existing.id}")
            print(f"Log in as {SEED_EMAIL} / {SEED_PASSWORD} to take it.")
            return

        quiz = Quiz(
            user_id=user.id,
            document_id=document.id,
            title=QUIZ_TITLE,
            topic="Databases",
            difficulty="easy",
            question_count=len(QUESTIONS),
            status="ready",
        )
        db.add(quiz)
        db.flush()

        for q in QUESTIONS:
            db.add(
                QuizQuestion(
                    quiz_id=quiz.id,
                    question=q["question"],
                    option_a=q["options"][0],
                    option_b=q["options"][1],
                    option_c=q["options"][2],
                    option_d=q["options"][3],
                    correct_answer=q["correct_answer"],
                    explanation=q["explanation"],
                    topic=q["topic"],
                    difficulty="easy",
                )
            )

        db.commit()
        print(f"Created seed quiz: quiz_id={quiz.id}")
        print(f"Log in as {SEED_EMAIL} / {SEED_PASSWORD} to take it.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
