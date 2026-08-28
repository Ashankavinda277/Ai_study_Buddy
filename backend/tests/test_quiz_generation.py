from app.models.document import Document
from app.schemas.quiz_generation import AIQuizQuestion, AIQuizResponse
from app.services.quiz_generator import QuizGenerationError


def register_and_login(client, email):
    client.post(
        "/auth/register",
        json={"name": "Student", "email": email, "password": "password123"},
    )
    client.post("/auth/login", json={"email": email, "password": "password123"})


def seed_document(db_session, status: str = "ready") -> Document:
    document = Document(filename="notes.pdf", filepath="x", status=status, size_bytes=100)
    db_session.add(document)
    db_session.commit()
    db_session.refresh(document)
    return document


def fake_ai_quiz(count: int = 5) -> AIQuizResponse:
    return AIQuizResponse(
        title="Generated Quiz",
        questions=[
            AIQuizQuestion(
                question=f"Question {i}?",
                options=["A", "B", "C", "D"],
                correct_answer=1,
                explanation="Because reasons.",
                topic="Keys",
                difficulty="medium",
                source_page=i,
            )
            for i in range(count)
        ],
    )


def test_list_available_documents_requires_authentication(client):
    response = client.get("/quizzes/documents")

    assert response.status_code == 401


def test_list_available_documents_returns_real_documents(client, db_session):
    register_and_login(client, "gen1@example.com")
    document = seed_document(db_session)

    response = client.get("/quizzes/documents")

    assert response.status_code == 200
    docs = response.json()
    assert any(d["id"] == document.id and d["filename"] == "notes.pdf" for d in docs)


def test_generate_quiz_rejects_unknown_document(client, db_session):
    register_and_login(client, "gen2@example.com")

    response = client.post(
        "/quizzes/generate",
        json={"document_id": "not-a-real-document", "difficulty": "easy", "question_count": 5},
    )

    assert response.status_code == 404


def test_generate_quiz_rejects_invalid_difficulty(client, db_session):
    register_and_login(client, "gen3@example.com")
    document = seed_document(db_session)

    response = client.post(
        "/quizzes/generate",
        json={"document_id": document.id, "difficulty": "impossible", "question_count": 5},
    )

    assert response.status_code == 422


def test_generate_quiz_rejects_invalid_question_count(client, db_session):
    register_and_login(client, "gen4@example.com")
    document = seed_document(db_session)

    response = client.post(
        "/quizzes/generate",
        json={"document_id": document.id, "difficulty": "easy", "question_count": 7},
    )

    assert response.status_code == 422


def test_generate_quiz_success_saves_ready_quiz(client, db_session, monkeypatch):
    register_and_login(client, "gen5@example.com")
    document = seed_document(db_session)

    monkeypatch.setattr(
        "app.api.routes.quizzes.generate_quiz_content",
        lambda **kwargs: fake_ai_quiz(count=kwargs["question_count"]),
    )

    response = client.post(
        "/quizzes/generate",
        json={
            "document_id": document.id,
            "topic": "Keys",
            "difficulty": "medium",
            "question_count": 5,
        },
    )

    assert response.status_code == 201
    quiz_id = response.json()["quiz_id"]

    quiz_response = client.get(f"/quizzes/{quiz_id}")
    assert quiz_response.status_code == 200
    body = quiz_response.json()
    assert body["status"] == "ready"
    assert body["title"] == "Generated Quiz"
    assert len(body["questions"]) == 5
    # answer key must still be hidden even on an AI-generated quiz
    assert all("correct_answer" not in q for q in body["questions"])


def test_generate_quiz_failure_saves_failed_status_and_returns_502(client, db_session, monkeypatch):
    register_and_login(client, "gen6@example.com")
    document = seed_document(db_session)

    def raise_error(**kwargs):
        raise QuizGenerationError("AI response failed validation after 2 attempts")

    monkeypatch.setattr("app.api.routes.quizzes.generate_quiz_content", raise_error)

    response = client.post(
        "/quizzes/generate",
        json={"document_id": document.id, "difficulty": "medium", "question_count": 5},
    )

    assert response.status_code == 502
    assert "failed validation" in response.json()["detail"]

    from app.models.quiz import Quiz

    saved_quiz = db_session.query(Quiz).filter(Quiz.document_id == document.id).first()
    assert saved_quiz is not None
    assert saved_quiz.status == "failed"
