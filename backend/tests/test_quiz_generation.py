from app.api.routes.quizzes import SEED_QUIZ_TITLE
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


def seed_source_quiz(db_session, user_id: int) -> Quiz:
    """Mimics scripts/seed_quiz.py: a quiz titled SEED_QUIZ_TITLE with 5
    questions, which /quizzes/generate clones from."""
    document = Document(filename="seed-document.txt", filepath="seed", status="ready", size_bytes=0)
    db_session.add(document)
    db_session.flush()

    quiz = Quiz(
        user_id=user_id,
        document_id=document.id,
        title=SEED_QUIZ_TITLE,
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
    return quiz


def test_list_available_documents_requires_authentication(client):
    response = client.get("/quizzes/documents")

    assert response.status_code == 401


def test_list_available_documents_returns_fake_documents(client, db_session):
    register_and_login(client, "gen1@example.com")

    response = client.get("/quizzes/documents")

    assert response.status_code == 200
    documents = response.json()
    assert len(documents) > 0
    assert all({"id", "filename", "status"} <= set(doc.keys()) for doc in documents)


def test_generate_quiz_clones_seed_and_matches_requested_count(client, db_session):
    register_and_login(client, "gen2@example.com")
    seed_source_quiz(db_session, get_user_id(client))
    document_id = client.get("/quizzes/documents").json()[0]["id"]

    response = client.post(
        "/quizzes/generate",
        json={
            "document_id": document_id,
            "topic": "Keys",
            "difficulty": "medium",
            "question_count": 10,
        },
    )

    assert response.status_code == 201
    quiz_id = response.json()["quiz_id"]

    quiz_response = client.get(f"/quizzes/{quiz_id}")
    assert quiz_response.status_code == 200
    body = quiz_response.json()
    assert body["difficulty"] == "medium"
    assert body["topic"] == "Keys"
    # requested 10 but the seed only has 5 questions, so they should cycle
    assert len(body["questions"]) == 10


def test_generate_quiz_rejects_unknown_document(client, db_session):
    register_and_login(client, "gen3@example.com")
    seed_source_quiz(db_session, get_user_id(client))

    response = client.post(
        "/quizzes/generate",
        json={"document_id": "not-a-real-document", "difficulty": "easy", "question_count": 5},
    )

    assert response.status_code == 404


def test_generate_quiz_rejects_invalid_difficulty(client, db_session):
    register_and_login(client, "gen4@example.com")
    document_id = client.get("/quizzes/documents").json()[0]["id"]

    response = client.post(
        "/quizzes/generate",
        json={"document_id": document_id, "difficulty": "impossible", "question_count": 5},
    )

    assert response.status_code == 422


def test_generate_quiz_rejects_invalid_question_count(client, db_session):
    register_and_login(client, "gen5@example.com")
    document_id = client.get("/quizzes/documents").json()[0]["id"]

    response = client.post(
        "/quizzes/generate",
        json={"document_id": document_id, "difficulty": "easy", "question_count": 7},
    )

    assert response.status_code == 422


def test_generate_quiz_without_seed_returns_503(client, db_session):
    register_and_login(client, "gen6@example.com")
    document_id = client.get("/quizzes/documents").json()[0]["id"]

    response = client.post(
        "/quizzes/generate",
        json={"document_id": document_id, "difficulty": "easy", "question_count": 5},
    )

    assert response.status_code == 503
