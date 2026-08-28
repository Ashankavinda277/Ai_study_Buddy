from app.services.grading import (
    GradableQuestion,
    SubmittedAnswer,
    grade_quiz,
    performance_level,
)


def make_questions(count: int = 5, correct_answer: int = 1) -> list[GradableQuestion]:
    return [GradableQuestion(id=i, correct_answer=correct_answer) for i in range(1, count + 1)]


def test_all_correct_is_100_percent_excellent():
    questions = make_questions()
    answers = [SubmittedAnswer(question_id=q.id, selected_answer=1) for q in questions]

    result = grade_quiz(questions, answers)

    assert result.correct_count == 5
    assert result.incorrect_count == 0
    assert result.score_percentage == 100.0
    assert result.performance_level == "Excellent"


def test_three_of_five_correct_is_60_percent_satisfactory():
    questions = make_questions()
    answers = [
        SubmittedAnswer(question_id=q.id, selected_answer=1 if i < 3 else 0)
        for i, q in enumerate(questions)
    ]

    result = grade_quiz(questions, answers)

    assert result.correct_count == 3
    assert result.incorrect_count == 2
    assert result.score_percentage == 60.0
    assert result.performance_level == "Satisfactory"


def test_unanswered_question_counts_as_incorrect():
    questions = make_questions()
    answers = [SubmittedAnswer(question_id=q.id, selected_answer=None) for q in questions]

    result = grade_quiz(questions, answers)

    assert result.correct_count == 0
    assert result.score_percentage == 0.0
    assert all(r.selected_answer is None and not r.is_correct for r in result.question_results)


def test_missing_answer_for_a_question_is_treated_as_unanswered():
    questions = make_questions()

    result = grade_quiz(questions, answers=[])

    assert result.correct_count == 0
    assert len(result.question_results) == 5
    assert all(r.selected_answer is None for r in result.question_results)


def test_extra_submitted_answers_for_unknown_questions_are_ignored():
    questions = make_questions(count=2)
    answers = [
        SubmittedAnswer(question_id=1, selected_answer=1),
        SubmittedAnswer(question_id=2, selected_answer=1),
        SubmittedAnswer(question_id=999, selected_answer=1),  # not a real question
    ]

    result = grade_quiz(questions, answers)

    assert result.total_questions == 2
    assert result.correct_count == 2


def test_performance_level_boundaries():
    assert performance_level(100) == "Excellent"
    assert performance_level(80) == "Excellent"
    assert performance_level(79.9) == "Good"
    assert performance_level(65) == "Good"
    assert performance_level(64.9) == "Satisfactory"
    assert performance_level(50) == "Satisfactory"
    assert performance_level(49.9) == "Needs Improvement"
    assert performance_level(0) == "Needs Improvement"
