import pytest

from app.models.document import Document
from app.models.quiz import Quiz
from app.models.quiz_question import QuizQuestion
from app.models.topic_performance import TopicPerformance


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


def make_quiz_with_topics(db_session, user_id: int, topics: list[str]) -> Quiz:
    document = Document(filename="doc.txt", filepath="x", status="ready", size_bytes=0)
    db_session.add(document)
    db_session.flush()

    quiz = Quiz(
        user_id=user_id,
        document_id=document.id,
        title="Mixed quiz",
        difficulty="easy",
        question_count=len(topics),
        status="ready",
    )
    db_session.add(quiz)
    db_session.flush()

    for topic in topics:
        db_session.add(
            QuizQuestion(
                quiz_id=quiz.id,
                question=f"Q about {topic}",
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


def submit_answers(client, quiz, db_session, correct_flags: list[bool]):
    questions = (
        db_session.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz.id).order_by(QuizQuestion.id).all()
    )
    answers = [
        {"question_id": q.id, "selected_answer": 1 if is_correct else 0}
        for q, is_correct in zip(questions, correct_flags)
    ]
    return client.post(f"/quizzes/{quiz.id}/submit", json={"answers": answers, "time_taken": 30})


def test_submit_creates_topic_performance_rows_with_correct_math(client, db_session):
    register_and_login(client, "topic1@example.com")
    user_id = get_user_id(client)
    quiz = make_quiz_with_topics(db_session, user_id, ["Keys", "Keys", "Joins"])

    submit_answers(client, quiz, db_session, [True, False, True])

    rows = {
        r.topic: r
        for r in db_session.query(TopicPerformance).filter(TopicPerformance.user_id == user_id).all()
    }
    assert rows["Keys"].total_attempted == 2
    assert rows["Keys"].total_correct == 1
    assert rows["Keys"].accuracy == 50.0
    assert rows["Joins"].total_attempted == 1
    assert rows["Joins"].total_correct == 1
    assert rows["Joins"].accuracy == 100.0


def test_topic_performance_accumulates_across_multiple_submissions(client, db_session):
    register_and_login(client, "topic2@example.com")
    user_id = get_user_id(client)
    quiz1 = make_quiz_with_topics(db_session, user_id, ["Keys"])
    quiz2 = make_quiz_with_topics(db_session, user_id, ["Keys"])

    submit_answers(client, quiz1, db_session, [True])
    submit_answers(client, quiz2, db_session, [False])

    row = (
        db_session.query(TopicPerformance)
        .filter(TopicPerformance.user_id == user_id, TopicPerformance.topic == "Keys")
        .first()
    )
    assert row.total_attempted == 2
    assert row.total_correct == 1
    assert row.accuracy == 50.0


def test_topic_performance_isolated_per_user(client, db_session):
    register_and_login(client, "topicowner@example.com")
    owner_id = get_user_id(client)
    quiz = make_quiz_with_topics(db_session, owner_id, ["Keys"])
    submit_answers(client, quiz, db_session, [True])
    client.post("/auth/logout")

    register_and_login(client, "topicother@example.com")
    other_id = get_user_id(client)

    rows = db_session.query(TopicPerformance).filter(TopicPerformance.user_id == other_id).all()
    assert rows == []
