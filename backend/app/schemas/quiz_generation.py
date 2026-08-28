"""Shape of the AI's quiz-generation output, and the checks it must pass
before we trust it enough to save to the database (Features 3 and 4).

Structural checks (exactly 4 options, correct_answer in 0-3, non-empty
strings) live on the Pydantic models, since Pydantic already rejects
malformed JSON before any of our own code has to think about it.
Checks that need to see the *whole* response at once — the right
number of questions, no duplicate questions — live in
find_validation_errors() below, run after Pydantic validation passes.
"""

from typing import Literal

from pydantic import BaseModel, Field, field_validator


class AIQuizQuestion(BaseModel):
    question: str = Field(min_length=1)
    options: list[str] = Field(min_length=4, max_length=4)
    correct_answer: int = Field(ge=0, le=3)
    explanation: str = Field(min_length=1)
    topic: str = Field(min_length=1)
    difficulty: Literal["easy", "medium", "hard"]
    source_page: int | None = None

    @field_validator("question", "explanation", "topic")
    @classmethod
    def not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("must not be blank")
        return value

    @field_validator("options")
    @classmethod
    def options_not_blank(cls, options: list[str]) -> list[str]:
        if any(not opt.strip() for opt in options):
            raise ValueError("options must not contain blank strings")
        return options


class AIQuizResponse(BaseModel):
    title: str = Field(min_length=1)
    questions: list[AIQuizQuestion]


def find_validation_errors(quiz: AIQuizResponse, expected_question_count: int) -> list[str]:
    """Business-rule checks that need the whole response, not just one
    question. Returns an empty list if the quiz is good to save."""
    errors: list[str] = []

    if len(quiz.questions) != expected_question_count:
        errors.append(
            f"Expected {expected_question_count} questions, got {len(quiz.questions)}"
        )

    seen: set[str] = set()
    for q in quiz.questions:
        key = q.question.strip().lower()
        if key in seen:
            errors.append(f"Duplicate question: {q.question!r}")
        seen.add(key)

    return errors
