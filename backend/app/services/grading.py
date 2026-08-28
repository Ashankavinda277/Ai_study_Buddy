from dataclasses import dataclass


@dataclass
class GradableQuestion:
    id: int
    correct_answer: int


@dataclass
class SubmittedAnswer:
    question_id: int
    selected_answer: int | None


@dataclass
class QuestionResult:
    question_id: int
    selected_answer: int | None
    correct_answer: int
    is_correct: bool


@dataclass
class GradingResult:
    correct_count: int
    incorrect_count: int
    total_questions: int
    score_percentage: float
    performance_level: str
    question_results: list[QuestionResult]


def performance_level(score_percentage: float) -> str:
    if score_percentage >= 80:
        return "Excellent"
    if score_percentage >= 65:
        return "Good"
    if score_percentage >= 50:
        return "Satisfactory"
    return "Needs Improvement"


def grade_quiz(
    questions: list[GradableQuestion], answers: list[SubmittedAnswer]
) -> GradingResult:
    """Pure grading logic: no database access, so it's trivial to unit test.

    `questions` is the answer key loaded from the DB; `answers` is whatever the
    client submitted. Only question IDs that exist in `questions` are graded,
    so a client can never claim credit for a question that isn't really on
    the quiz, and correctness is always computed from the server's own
    `correct_answer`, never trusted from the client.
    """
    answer_by_question = {a.question_id: a.selected_answer for a in answers}

    question_results: list[QuestionResult] = []
    correct_count = 0
    for question in questions:
        selected = answer_by_question.get(question.id)
        is_correct = selected is not None and selected == question.correct_answer
        if is_correct:
            correct_count += 1
        question_results.append(
            QuestionResult(
                question_id=question.id,
                selected_answer=selected,
                correct_answer=question.correct_answer,
                is_correct=is_correct,
            )
        )

    total_questions = len(questions)
    incorrect_count = total_questions - correct_count
    score_percentage = (
        round((correct_count / total_questions) * 100, 2) if total_questions else 0.0
    )

    return GradingResult(
        correct_count=correct_count,
        incorrect_count=incorrect_count,
        total_questions=total_questions,
        score_percentage=score_percentage,
        performance_level=performance_level(score_percentage),
        question_results=question_results,
    )
