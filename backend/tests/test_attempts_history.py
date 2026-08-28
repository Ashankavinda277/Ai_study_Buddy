import pytest

from app.models.document import Document
from app.models.quiz import Quiz
from app.models.quiz_question import QuizQuestion


@pytest.fixture(autouse=True)
def no_real_ai_calls(monkeypatch):
    """These tests are about history listing, not feedback generation —
    never let a submit() call in here reach the real Gemini API."""
    monkeypatch.setattr("app.api.routes.quizzes.retrieval_client.search_chunks", lambda *a, **k: [])
    monkeypatch.setattr("app.api.routes.quizzes.generate_feedback", lambda **kwargs: None)


def register_and_login(client, email):
    client.post(
        "/auth/register",
        json={"name": "Student", "email": email, "password": "password123"},
    )
    client.post("/auth/login", json={"email": email, "password": "password123"})


def get_user_id(client) -> int:
    return client.get("/auth/me").json()["id"]


def make_quiz(db_session, user_id: int, topic: str, difficulty: str, filename: str = "doc.txt") -> Quiz:
    document = Document(filename=filename, filepath="x", status="ready", size_bytes=0)
    db_session.add(document)
    db_session.flush()

    quiz = Quiz(
        user_id=user_id,
        document_id=document.id,
        title=f"{topic} quiz",
        topic=topic,
        difficulty=difficulty,
        question_count=2,
        status="ready",
    )
    db_session.add(quiz)
    db_session.flush()

    for i in range(2):
        db_session.add(
            QuizQuestion(
                quiz_id=quiz.id,
                question=f"Q{i}",
                option_a="A",
                option_b="B",
                option_c="C",
                option_d="D",
                correct_answer=1,
                explanation="Because.",
                topic=topic,
            )
        )
    db_session.commit()
    db_session.refresh(quiz)
    return quiz


def submit(client, quiz, db_session, num_correct):
    questions = db_session.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz.id).order_by(QuizQuestion.id).all()
    answers = [
        {"question_id": q.id, "selected_answer": 1 if i < num_correct else 0}
        for i, q in enumerate(questions)
    ]
    return client.post(f"/quizzes/{quiz.id}/submit", json={"answers": answers, "time_taken": 10}).json()


def test_list_attempts_requires_authentication(client):
    response = client.get("/attempts")
    assert response.status_code == 401


def test_list_attempts_only_shows_own_attempts(client, db_session):
    register_and_login(client, "owner@example.com")
    owner_quiz = make_quiz(db_session, get_user_id(client), "Keys", "easy")
    submit(client, owner_quiz, db_session, num_correct=2)
    client.post("/auth/logout")

    register_and_login(client, "other@example.com")
    other_quiz = make_quiz(db_session, get_user_id(client), "Joins", "hard")
    submit(client, other_quiz, db_session, num_correct=1)

    response = client.get("/attempts")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["topic"] == "Joins"


def test_list_attempts_filters_by_difficulty(client, db_session):
    register_and_login(client, "filter1@example.com")
    user_id = get_user_id(client)
    easy_quiz = make_quiz(db_session, user_id, "Keys", "easy")
    hard_quiz = make_quiz(db_session, user_id, "Joins", "hard")
    submit(client, easy_quiz, db_session, num_correct=2)
    submit(client, hard_quiz, db_session, num_correct=2)

    response = client.get("/attempts", params={"difficulty": "hard"})

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["difficulty"] == "hard"


def test_list_attempts_filters_by_topic_substring(client, db_session):
    register_and_login(client, "filter2@example.com")
    user_id = get_user_id(client)
    quiz1 = make_quiz(db_session, user_id, "Database Normalization", "medium")
    quiz2 = make_quiz(db_session, user_id, "Networking Basics", "medium")
    submit(client, quiz1, db_session, num_correct=2)
    submit(client, quiz2, db_session, num_correct=2)

    response = client.get("/attempts", params={"topic": "normal"})

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["topic"] == "Database Normalization"


def test_list_attempts_sort_by_score(client, db_session):
    register_and_login(client, "sort1@example.com")
    user_id = get_user_id(client)
    low_quiz = make_quiz(db_session, user_id, "Keys", "easy")
    high_quiz = make_quiz(db_session, user_id, "Joins", "easy")
    submit(client, low_quiz, db_session, num_correct=0)
    submit(client, high_quiz, db_session, num_correct=2)

    response = client.get("/attempts", params={"sort": "score"})

    assert response.status_code == 200
    scores = [row["score_percentage"] for row in response.json()]
    assert scores == sorted(scores, reverse=True)


def test_list_attempts_default_sort_is_newest_first(client, db_session):
    register_and_login(client, "sort2@example.com")
    user_id = get_user_id(client)
    first_quiz = make_quiz(db_session, user_id, "First", "easy")
    second_quiz = make_quiz(db_session, user_id, "Second", "easy")
    first_result = submit(client, first_quiz, db_session, num_correct=1)
    second_result = submit(client, second_quiz, db_session, num_correct=1)

    response = client.get("/attempts")

    ids = [row["id"] for row in response.json()]
    assert ids == [second_result["attempt_id"], first_result["attempt_id"]]


def test_list_attempts_includes_document_filename(client, db_session):
    register_and_login(client, "docname@example.com")
    quiz = make_quiz(db_session, get_user_id(client), "Keys", "easy", filename="chapter4.pdf")
    submit(client, quiz, db_session, num_correct=2)

    response = client.get("/attempts")

    assert response.json()[0]["document_filename"] == "chapter4.pdf"
