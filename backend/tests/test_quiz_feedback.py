from app.models.document import Document
from app.models.quiz import Quiz
from app.models.quiz_question import QuizQuestion


def register_and_login(client, email):
    client.post(
        "/auth/register",
        json={"name": "Student", "email": email, "password": "password123"},
    )
    client.post("/auth/login", json={"email": email, "password": "password123"})


def get_user_id(client) -> int:
    return client.get("/auth/me").json()["id"]


def seed_quiz(db_session, user_id: int) -> Quiz:
    document = Document(filename="doc.txt", filepath="x", status="ready", size_bytes=0)
    db_session.add(document)
    db_session.flush()

    quiz = Quiz(
        user_id=user_id,
        document_id=document.id,
        title="Test Quiz",
        topic="Keys",
        difficulty="easy",
        question_count=5,
        status="ready",
    )
    db_session.add(quiz)
    db_session.flush()

    for i in range(5):
        db_session.add(
            QuizQuestion(
                quiz_id=quiz.id,
                question=f"Question {i}",
                option_a="A",
                option_b="B",
                option_c="C",
                option_d="D",
                correct_answer=1,
                explanation=f"Explanation {i}",
                topic="Keys",
            )
        )
    db_session.commit()
    db_session.refresh(quiz)
    return quiz


def test_submit_with_wrong_answers_saves_ai_feedback(client, db_session, monkeypatch):
    register_and_login(client, "fb1@example.com")
    quiz = seed_quiz(db_session, get_user_id(client))
    questions = (
        db_session.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz.id).order_by(QuizQuestion.id).all()
    )

    monkeypatch.setattr("app.api.routes.quizzes.retrieval_client.search_chunks", lambda *a, **k: [])
    monkeypatch.setattr("app.api.routes.quizzes.generate_feedback", lambda **kwargs: "You should review Keys.")

    answers = [{"question_id": q.id, "selected_answer": 0} for q in questions]  # all wrong (correct=1)
    response = client.post(f"/quizzes/{quiz.id}/submit", json={"answers": answers, "time_taken": 60})
    assert response.status_code == 200
    attempt_id = response.json()["attempt_id"]

    detail = client.get(f"/attempts/{attempt_id}").json()
    assert detail["ai_feedback"] == "You should review Keys."


def test_submit_perfect_score_gets_canned_feedback_without_calling_ai(client, db_session, monkeypatch):
    register_and_login(client, "fb2@example.com")
    quiz = seed_quiz(db_session, get_user_id(client))
    questions = db_session.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz.id).all()

    calls = []
    monkeypatch.setattr(
        "app.api.routes.quizzes.generate_feedback",
        lambda **kwargs: calls.append(kwargs) or "Perfect score! Great job.",
    )

    answers = [{"question_id": q.id, "selected_answer": 1} for q in questions]  # all correct
    response = client.post(f"/quizzes/{quiz.id}/submit", json={"answers": answers, "time_taken": 30})
    attempt_id = response.json()["attempt_id"]

    detail = client.get(f"/attempts/{attempt_id}").json()
    assert "Perfect score" in detail["ai_feedback"]
    # feedback_generator itself decides not to call the AI for a perfect score;
    # the route still calls generate_feedback with an empty incorrect_items list.
    assert calls[0]["incorrect_items"] == []


def test_submit_succeeds_even_if_feedback_generation_raises(client, db_session, monkeypatch):
    register_and_login(client, "fb3@example.com")
    quiz = seed_quiz(db_session, get_user_id(client))
    questions = db_session.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz.id).all()

    def boom(*a, **k):
        raise RuntimeError("network blip")

    monkeypatch.setattr("app.api.routes.quizzes.retrieval_client.search_chunks", boom)

    answers = [{"question_id": q.id, "selected_answer": 0} for q in questions]
    response = client.post(f"/quizzes/{quiz.id}/submit", json={"answers": answers, "time_taken": 45})

    assert response.status_code == 200
    attempt_id = response.json()["attempt_id"]
    detail = client.get(f"/attempts/{attempt_id}").json()
    assert detail["ai_feedback"] is None


def test_feedback_only_receives_incorrect_questions_never_correct_ones(client, db_session, monkeypatch):
    register_and_login(client, "fb4@example.com")
    quiz = seed_quiz(db_session, get_user_id(client))
    questions = (
        db_session.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz.id).order_by(QuizQuestion.id).all()
    )

    captured = {}

    def fake_generate_feedback(**kwargs):
        captured.update(kwargs)
        return "feedback"

    monkeypatch.setattr("app.api.routes.quizzes.retrieval_client.search_chunks", lambda *a, **k: [])
    monkeypatch.setattr("app.api.routes.quizzes.generate_feedback", fake_generate_feedback)

    # first 3 correct (answer=1), last 2 wrong (answer=0)
    answers = [
        {"question_id": q.id, "selected_answer": 1 if i < 3 else 0} for i, q in enumerate(questions)
    ]
    client.post(f"/quizzes/{quiz.id}/submit", json={"answers": answers, "time_taken": 60})

    assert len(captured["incorrect_items"]) == 2
    incorrect_questions = {item.question for item in captured["incorrect_items"]}
    assert incorrect_questions == {questions[3].question, questions[4].question}
