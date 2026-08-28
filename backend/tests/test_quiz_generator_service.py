import json

import pytest

from app.services import quiz_generator
from app.services.retrieval_client import RetrievedChunk

VALID_RESPONSE = json.dumps(
    {
        "title": "Database Basics",
        "questions": [
            {
                "question": f"Question {i}?",
                "options": ["A", "B", "C", "D"],
                "correct_answer": 1,
                "explanation": "Because reasons.",
                "topic": "Keys",
                "difficulty": "medium",
                "source_page": 3,
            }
            for i in range(5)
        ],
    }
)

INVALID_JSON = "this is not json"

WRONG_COUNT_RESPONSE = json.dumps(
    {
        "title": "Too few",
        "questions": [
            {
                "question": "Only one question?",
                "options": ["A", "B", "C", "D"],
                "correct_answer": 0,
                "explanation": "Because.",
                "topic": "Keys",
                "difficulty": "medium",
                "source_page": None,
            }
        ],
    }
)


@pytest.fixture(autouse=True)
def fake_chunks(monkeypatch):
    monkeypatch.setattr(
        quiz_generator.retrieval_client,
        "search_chunks",
        lambda document_id, query, top_k=8: [
            RetrievedChunk(text="A primary key uniquely identifies a row.", page=3, document_id=document_id)
        ],
    )


def test_generates_valid_quiz_on_first_try(monkeypatch):
    monkeypatch.setattr(quiz_generator, "_call_ai", lambda prompt: VALID_RESPONSE)

    quiz = quiz_generator.generate_quiz_content(
        document_id="doc-1", topic="Keys", difficulty="medium", question_count=5
    )

    assert quiz.title == "Database Basics"
    assert len(quiz.questions) == 5


def test_retries_once_after_invalid_json_then_succeeds(monkeypatch):
    responses = iter([INVALID_JSON, VALID_RESPONSE])
    monkeypatch.setattr(quiz_generator, "_call_ai", lambda prompt: next(responses))

    quiz = quiz_generator.generate_quiz_content(
        document_id="doc-1", topic="Keys", difficulty="medium", question_count=5
    )

    assert len(quiz.questions) == 5


def test_raises_after_max_attempts_all_invalid(monkeypatch):
    monkeypatch.setattr(quiz_generator, "_call_ai", lambda prompt: INVALID_JSON)

    with pytest.raises(quiz_generator.QuizGenerationError):
        quiz_generator.generate_quiz_content(
            document_id="doc-1", topic="Keys", difficulty="medium", question_count=5
        )


def test_wrong_question_count_is_treated_as_invalid_and_retried(monkeypatch):
    call_count = {"n": 0}

    def fake_call(prompt):
        call_count["n"] += 1
        return WRONG_COUNT_RESPONSE

    monkeypatch.setattr(quiz_generator, "_call_ai", fake_call)

    with pytest.raises(quiz_generator.QuizGenerationError):
        quiz_generator.generate_quiz_content(
            document_id="doc-1", topic="Keys", difficulty="medium", question_count=5
        )

    assert call_count["n"] == quiz_generator.MAX_ATTEMPTS


def test_api_call_exception_is_retried_not_raised_immediately(monkeypatch):
    responses = iter([RuntimeError("rate limited"), VALID_RESPONSE])

    def fake_call(prompt):
        next_response = next(responses)
        if isinstance(next_response, Exception):
            raise next_response
        return next_response

    monkeypatch.setattr(quiz_generator, "_call_ai", fake_call)

    quiz = quiz_generator.generate_quiz_content(
        document_id="doc-1", topic="Keys", difficulty="medium", question_count=5
    )

    assert len(quiz.questions) == 5


def test_api_call_exception_on_every_attempt_raises_quiz_generation_error(monkeypatch):
    def always_raise(prompt):
        raise RuntimeError("invalid API key")

    monkeypatch.setattr(quiz_generator, "_call_ai", always_raise)

    with pytest.raises(quiz_generator.QuizGenerationError):
        quiz_generator.generate_quiz_content(
            document_id="doc-1", topic="Keys", difficulty="medium", question_count=5
        )


def test_no_chunks_found_raises_without_calling_ai(monkeypatch):
    monkeypatch.setattr(quiz_generator.retrieval_client, "search_chunks", lambda *a, **k: [])
    calls = []
    monkeypatch.setattr(quiz_generator, "_call_ai", lambda prompt: calls.append(prompt))

    with pytest.raises(quiz_generator.QuizGenerationError):
        quiz_generator.generate_quiz_content(
            document_id="doc-1", topic="Keys", difficulty="medium", question_count=5
        )

    assert calls == []


def test_prompt_includes_context_difficulty_and_count():
    prompt = quiz_generator.build_prompt(
        chunks=["Primary keys are unique."],
        topic="Keys",
        difficulty="hard",
        question_count=10,
    )

    assert "Primary keys are unique." in prompt
    assert "hard" in prompt
    assert "exactly 10" in prompt
    assert "Keys" in prompt


def test_prompt_without_topic_covers_whole_document():
    prompt = quiz_generator.build_prompt(
        chunks=["Some notes."], topic=None, difficulty="easy", question_count=5
    )

    assert "entire document" not in prompt  # not literal, just check the fallback phrasing is present
    assert "Cover the document as a whole." in prompt
