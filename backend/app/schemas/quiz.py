from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class QuizQuestionPublic(BaseModel):
    """Question shape sent to the browser before submission.

    Deliberately has no `correct_answer` or `explanation` field: if those
    were ever added here, a student could read the answer key straight out
    of the network tab in DevTools.
    """

    model_config = ConfigDict(from_attributes=True)

    id: int
    question: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    topic: str | None = None
    difficulty: str | None = None
    source_page: int | None = None


class QuizPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    topic: str | None = None
    difficulty: str
    question_count: int
    status: str
    questions: list[QuizQuestionPublic]


class AnswerIn(BaseModel):
    question_id: int
    selected_answer: int | None = Field(default=None, ge=0, le=3)


class QuizSubmitRequest(BaseModel):
    answers: list[AnswerIn]
    time_taken: int | None = None


class QuizSubmitResponse(BaseModel):
    attempt_id: int
    correct_count: int
    incorrect_count: int
    total_questions: int
    score_percentage: float
    performance_level: str


class QuestionReview(BaseModel):
    question_id: int
    question: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    selected_answer: int | None
    correct_answer: int
    is_correct: bool
    explanation: str | None = None
    topic: str | None = None
    source_page: int | None = None


class AvailableDocument(BaseModel):
    id: str
    filename: str
    status: str


class QuizGenerateRequest(BaseModel):
    document_id: str
    topic: str | None = None
    difficulty: Literal["easy", "medium", "hard"]
    question_count: Literal[5, 10, 15]
    question_type: Literal["mcq"] = "mcq"


class QuizGenerateResponse(BaseModel):
    quiz_id: int


class AttemptDetail(BaseModel):
    id: int
    quiz_id: int
    quiz_title: str
    correct_count: int
    incorrect_count: int
    total_questions: int
    score_percentage: float
    performance_level: str
    time_taken: int | None = None
    ai_feedback: str | None = None
    completed_at: datetime
    questions: list[QuestionReview]


class AttemptSummary(BaseModel):
    id: int
    quiz_id: int
    quiz_title: str
    document_filename: str
    topic: str | None = None
    difficulty: str
    score_percentage: float
    performance_level: str
    time_taken: int | None = None
    completed_at: datetime
