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
                topic="Topic",
            )
        )
    db_session.commit()
    db_session.refresh(quiz)
    return quiz


def test_get_quiz_hides_correct_answer_and_explanation(client, db_session):
    register_and_login(client, "student1@example.com")
    quiz = seed_quiz(db_session, get_user_id(client))

    response = client.get(f"/quizzes/{quiz.id}")

    assert response.status_code == 200
    body = response.json()
    assert len(body["questions"]) == 5
    for question in body["questions"]:
        assert "correct_answer" not in question
        assert "explanation" not in question


def test_get_quiz_requires_authentication(client, db_session):
    register_and_login(client, "student2@example.com")
    quiz = seed_quiz(db_session, get_user_id(client))
    client.post("/auth/logout")

    response = client.get(f"/quizzes/{quiz.id}")

    assert response.status_code == 401


def test_other_user_cannot_access_someone_elses_quiz(client, db_session):
    register_and_login(client, "owner@example.com")
    quiz = seed_quiz(db_session, get_user_id(client))
    client.post("/auth/logout")

    register_and_login(client, "intruder@example.com")
    response = client.get(f"/quizzes/{quiz.id}")

    assert response.status_code == 404


def test_submit_three_of_five_correct_gives_60_percent_satisfactory(client, db_session):
    register_and_login(client, "student3@example.com")
    quiz = seed_quiz(db_session, get_user_id(client))
    questions = (
        db_session.query(QuizQuestion)
        .filter(QuizQuestion.quiz_id == quiz.id)
        .order_by(QuizQuestion.id)
        .all()
    )

    answers = [
        {"question_id": q.id, "selected_answer": 1 if i < 3 else 0}
        for i, q in enumerate(questions)
    ]

    response = client.post(
        f"/quizzes/{quiz.id}/submit", json={"answers": answers, "time_taken": 120}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["correct_count"] == 3
    assert body["incorrect_count"] == 2
    assert body["score_percentage"] == 60.0
    assert body["performance_level"] == "Satisfactory"


def test_attempt_detail_shows_answers_and_explanations(client, db_session):
    register_and_login(client, "student4@example.com")
    quiz = seed_quiz(db_session, get_user_id(client))
    questions = db_session.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz.id).all()
    answers = [{"question_id": q.id, "selected_answer": 1} for q in questions]

    submit_response = client.post(
        f"/quizzes/{quiz.id}/submit", json={"answers": answers, "time_taken": 60}
    )
    attempt_id = submit_response.json()["attempt_id"]

    detail_response = client.get(f"/attempts/{attempt_id}")

    assert detail_response.status_code == 200
    detail = detail_response.json()
    assert detail["score_percentage"] == 100.0
    assert detail["performance_level"] == "Excellent"
    assert len(detail["questions"]) == 5
    for question in detail["questions"]:
        assert question["correct_answer"] == 1
        assert question["explanation"]


def test_attempt_not_accessible_by_other_user(client, db_session):
    register_and_login(client, "owner2@example.com")
    quiz = seed_quiz(db_session, get_user_id(client))
    questions = db_session.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz.id).all()
    answers = [{"question_id": q.id, "selected_answer": 1} for q in questions]
    submit_response = client.post(
        f"/quizzes/{quiz.id}/submit", json={"answers": answers, "time_taken": 30}
    )
    attempt_id = submit_response.json()["attempt_id"]
    client.post("/auth/logout")

    register_and_login(client, "intruder2@example.com")
    response = client.get(f"/attempts/{attempt_id}")

    assert response.status_code == 404
