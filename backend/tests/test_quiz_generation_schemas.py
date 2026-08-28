import pytest
from pydantic import ValidationError

from app.schemas.quiz_generation import AIQuizQuestion, AIQuizResponse, find_validation_errors


def make_question(**overrides) -> dict:
    base = {
        "question": "What is a primary key?",
        "options": ["A", "B", "C", "D"],
        "correct_answer": 1,
        "explanation": "It uniquely identifies a row.",
        "topic": "Keys",
        "difficulty": "medium",
        "source_page": 3,
    }
    base.update(overrides)
    return base


def test_valid_question_passes():
    question = AIQuizQuestion.model_validate(make_question())
    assert question.correct_answer == 1


def test_rejects_wrong_number_of_options():
    with pytest.raises(ValidationError):
        AIQuizQuestion.model_validate(make_question(options=["A", "B", "C"]))


def test_rejects_correct_answer_out_of_range():
    with pytest.raises(ValidationError):
        AIQuizQuestion.model_validate(make_question(correct_answer=4))


def test_rejects_negative_correct_answer():
    with pytest.raises(ValidationError):
        AIQuizQuestion.model_validate(make_question(correct_answer=-1))


def test_rejects_blank_question():
    with pytest.raises(ValidationError):
        AIQuizQuestion.model_validate(make_question(question="   "))


def test_rejects_blank_option():
    with pytest.raises(ValidationError):
        AIQuizQuestion.model_validate(make_question(options=["A", "  ", "C", "D"]))


def test_rejects_invalid_difficulty():
    with pytest.raises(ValidationError):
        AIQuizQuestion.model_validate(make_question(difficulty="impossible"))


def test_source_page_is_optional():
    question = AIQuizQuestion.model_validate(make_question(source_page=None))
    assert question.source_page is None


def test_find_validation_errors_accepts_matching_count_no_duplicates():
    quiz = AIQuizResponse.model_validate(
        {
            "title": "Sample",
            "questions": [
                make_question(question="Q1"),
                make_question(question="Q2"),
            ],
        }
    )

    errors = find_validation_errors(quiz, expected_question_count=2)

    assert errors == []


def test_find_validation_errors_flags_wrong_count():
    quiz = AIQuizResponse.model_validate(
        {"title": "Sample", "questions": [make_question(question="Q1")]}
    )

    errors = find_validation_errors(quiz, expected_question_count=5)

    assert any("Expected 5" in e for e in errors)


def test_find_validation_errors_flags_duplicate_questions():
    quiz = AIQuizResponse.model_validate(
        {
            "title": "Sample",
            "questions": [
                make_question(question="What is a primary key?"),
                make_question(question="What is a primary key?"),
            ],
        }
    )

    errors = find_validation_errors(quiz, expected_question_count=2)

    assert any("Duplicate question" in e for e in errors)


def test_find_validation_errors_duplicate_check_is_case_insensitive():
    quiz = AIQuizResponse.model_validate(
        {
            "title": "Sample",
            "questions": [
                make_question(question="What is a primary key?"),
                make_question(question="what is a primary key?"),
            ],
        }
    )

    errors = find_validation_errors(quiz, expected_question_count=2)

    assert any("Duplicate question" in e for e in errors)
