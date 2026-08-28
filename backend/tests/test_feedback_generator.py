from types import SimpleNamespace

from app.services import feedback_generator
from app.services.feedback_generator import IncorrectItem, generate_feedback


def test_perfect_score_skips_ai_call_entirely(monkeypatch):
    calls = []
    monkeypatch.setattr(
        feedback_generator._model, "generate_content", lambda prompt: calls.append(prompt)
    )

    feedback = generate_feedback(
        quiz_topic="Keys",
        score_percentage=100.0,
        performance_level="Excellent",
        incorrect_items=[],
        chunks=[],
    )

    assert "Perfect score" in feedback
    assert calls == []  # AI was never called


def test_generates_feedback_for_incorrect_items(monkeypatch):
    monkeypatch.setattr(
        feedback_generator._model,
        "generate_content",
        lambda prompt: SimpleNamespace(text="You should review normalization and keys."),
    )

    feedback = generate_feedback(
        quiz_topic="Databases",
        score_percentage=60.0,
        performance_level="Satisfactory",
        incorrect_items=[
            IncorrectItem(
                question="What is a foreign key?",
                selected_answer_text="Encrypting a column",
                correct_answer_text="Linking a row to a row in another table",
                explanation="A foreign key references another table's primary key.",
                topic="Keys",
            )
        ],
        chunks=["A foreign key links two tables together."],
    )

    assert feedback == "You should review normalization and keys."


def test_returns_none_on_ai_failure_instead_of_raising(monkeypatch):
    def raise_error(prompt):
        raise RuntimeError("rate limited")

    monkeypatch.setattr(feedback_generator._model, "generate_content", raise_error)

    feedback = generate_feedback(
        quiz_topic="Databases",
        score_percentage=60.0,
        performance_level="Satisfactory",
        incorrect_items=[
            IncorrectItem(
                question="Q1",
                selected_answer_text="A",
                correct_answer_text="B",
                explanation="Because B.",
                topic="Keys",
            )
        ],
        chunks=[],
    )

    assert feedback is None


def test_returns_none_on_blank_ai_response(monkeypatch):
    monkeypatch.setattr(
        feedback_generator._model, "generate_content", lambda prompt: SimpleNamespace(text="   ")
    )

    feedback = generate_feedback(
        quiz_topic="Databases",
        score_percentage=60.0,
        performance_level="Satisfactory",
        incorrect_items=[
            IncorrectItem(
                question="Q1",
                selected_answer_text="A",
                correct_answer_text="B",
                explanation="Because B.",
                topic="Keys",
            )
        ],
        chunks=[],
    )

    assert feedback is None


def test_prompt_never_includes_correct_questions_only_incorrect_ones():
    prompt = feedback_generator.build_feedback_prompt(
        quiz_topic="Databases",
        score_percentage=60.0,
        performance_level="Satisfactory",
        incorrect_items=[
            IncorrectItem(
                question="What is a foreign key?",
                selected_answer_text="Encrypting a column",
                correct_answer_text="Linking a row to a row in another table",
                explanation="A foreign key references another table's primary key.",
                topic="Keys",
            )
        ],
        chunks=["A foreign key links two tables together."],
    )

    assert "What is a foreign key?" in prompt
    assert "Linking a row to a row in another table" in prompt
    assert "60.0" in prompt
    assert "Satisfactory" in prompt


def test_prompt_handles_unanswered_question():
    prompt = feedback_generator.build_feedback_prompt(
        quiz_topic=None,
        score_percentage=0.0,
        performance_level="Needs Improvement",
        incorrect_items=[
            IncorrectItem(
                question="Q1",
                selected_answer_text=None,
                correct_answer_text="B",
                explanation=None,
                topic=None,
            )
        ],
        chunks=[],
    )

    assert "No answer given" in prompt
