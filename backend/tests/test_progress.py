import pytest

from app.models.document import Document
from app.models.quiz import Quiz
from app.models.quiz_question import QuizQuestion


@pytest.fixture(autouse=True)
def no_real_ai_calls(monkeypatch):
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
                explanation="exp",
                topic=topic,
            )
        )
    db_session.commit()
    db_session.refresh(quiz)
    return quiz


def submit(client, quiz, db_session, num_correct):
    questions = db_session.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz.id).order_by(QuizQuestion.id).all()
    answers = [
        {"question_id": q.id, "selected_answer": 1 if i < num_correct else 0} for i, q in enumerate(questions)
    ]
    return client.post(f"/quizzes/{quiz.id}/submit", json={"answers": answers, "time_taken": 20}).json()


def test_summary_requires_auth(client):
    assert client.get("/progress/summary").status_code == 401


def test_summary_empty_state_for_new_user(client, db_session):
    register_and_login(client, "empty@example.com")

    response = client.get("/progress/summary")

    assert response.status_code == 200
    body = response.json()
    assert body["total_quizzes_completed"] == 0
    assert body["recent_score"] is None
    assert body["strongest_topic"] is None
    assert body["recent_attempts"] == []
    assert body["score_trend"] == []


def test_summary_aggregates_correctly(client, db_session):
    register_and_login(client, "agg@example.com")
    user_id = get_user_id(client)
    easy_quiz = make_quiz(db_session, user_id, "Keys", "easy")
    hard_quiz = make_quiz(db_session, user_id, "Joins", "hard")
    submit(client, easy_quiz, db_session, num_correct=2)  # 100%
    submit(client, hard_quiz, db_session, num_correct=0)  # 0%

    response = client.get("/progress/summary")
    body = response.json()

    assert body["total_quizzes_completed"] == 2
    assert body["average_score"] == 50.0
    assert body["best_score"] == 100.0
    assert body["total_questions_answered"] == 4
    assert body["correct_answer_percentage"] == 50.0
    assert body["strongest_topic"] == "Keys"
    assert body["weakest_topic"] == "Joins"

    difficulties = {d["difficulty"]: d for d in body["performance_by_difficulty"]}
    assert difficulties["easy"]["average_score"] == 100.0
    assert difficulties["hard"]["average_score"] == 0.0
    assert len(body["recent_attempts"]) == 2
    assert len(body["score_trend"]) == 2


def test_summary_recent_score_is_most_recent_attempt(client, db_session):
    register_and_login(client, "recent@example.com")
    user_id = get_user_id(client)
    quiz1 = make_quiz(db_session, user_id, "A", "easy")
    quiz2 = make_quiz(db_session, user_id, "B", "easy")
    submit(client, quiz1, db_session, num_correct=0)
    submit(client, quiz2, db_session, num_correct=2)

    response = client.get("/progress/summary")

    assert response.json()["recent_score"] == 100.0


def test_summary_isolated_per_user(client, db_session):
    register_and_login(client, "sumowner@example.com")
    owner_id = get_user_id(client)
    quiz = make_quiz(db_session, owner_id, "Keys", "easy")
    submit(client, quiz, db_session, num_correct=2)
    client.post("/auth/logout")

    register_and_login(client, "sumother@example.com")
    response = client.get("/progress/summary")

    assert response.json()["total_quizzes_completed"] == 0


def test_topics_requires_auth(client):
    assert client.get("/progress/topics").status_code == 401


def test_topics_returns_classification(client, db_session):
    register_and_login(client, "topics@example.com")
    user_id = get_user_id(client)
    weak_quiz = make_quiz(db_session, user_id, "Weak Topic", "easy")
    strong_quiz = make_quiz(db_session, user_id, "Strong Topic", "easy")
    submit(client, weak_quiz, db_session, num_correct=0)
    submit(client, strong_quiz, db_session, num_correct=2)

    response = client.get("/progress/topics")

    assert response.status_code == 200
    by_topic = {t["topic"]: t for t in response.json()}
    assert by_topic["Weak Topic"]["classification"] == "Weak"
    assert by_topic["Strong Topic"]["classification"] == "Strong"


def test_topics_isolated_per_user(client, db_session):
    register_and_login(client, "topicsowner@example.com")
    owner_id = get_user_id(client)
    quiz = make_quiz(db_session, owner_id, "Secret Topic", "easy")
    submit(client, quiz, db_session, num_correct=2)
    client.post("/auth/logout")

    register_and_login(client, "topicsother@example.com")
    response = client.get("/progress/topics")

    assert response.json() == []
