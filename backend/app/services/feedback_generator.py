"""AI-generated post-quiz feedback (Feature 7).

Deliberately narrow inputs: only the questions the student got wrong,
their answer, the correct answer, the explanation, and a handful of
document chunks relevant to the missed topics. Never the whole
document, and never the questions they got right — smaller prompt,
lower cost, and the AI has no way to comment on material it wasn't
shown.

Separate from app/llm.py (Member 1's chat feature) and
app/services/quiz_generator.py (structured JSON generation) — this one
returns plain prose, no JSON mode needed.
"""

import logging
import os
from dataclasses import dataclass

import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
_model = genai.GenerativeModel("gemini-3.6-flash")


@dataclass
class IncorrectItem:
    question: str
    selected_answer_text: str | None  # None if the student left it unanswered
    correct_answer_text: str
    explanation: str | None
    topic: str | None


def build_feedback_prompt(
    quiz_topic: str | None,
    score_percentage: float,
    performance_level: str,
    incorrect_items: list[IncorrectItem],
    chunks: list[str],
) -> str:
    topic_line = f'on "{quiz_topic}" ' if quiz_topic else ""

    missed_block = "\n\n".join(
        f"{i}. Question: {item.question}\n"
        f"   Their answer: {item.selected_answer_text or 'No answer given'}\n"
        f"   Correct answer: {item.correct_answer_text}\n"
        f"   Why: {item.explanation or 'Not provided'}\n"
        f"   Topic: {item.topic or 'General'}"
        for i, item in enumerate(incorrect_items, start=1)
    )

    context_block = "\n\n---\n\n".join(chunks) if chunks else "(no additional notes retrieved)"

    return f"""You are a supportive study coach. A student just completed a quiz {topic_line}and scored {score_percentage}% ({performance_level}).

Here are the questions they got wrong:

{missed_block}

Relevant notes for context:
{context_block}

Write a short, encouraging feedback paragraph (3-5 sentences) for the student:
- Mention their overall performance.
- Name the specific topics they should review, based only on the questions above.
- Suggest what to focus on next.
- Do not reference option letters like A/B/C/D.
- Do not invent facts that aren't in the notes above.
- Write directly to the student ("you"), not about them.
"""


def generate_feedback(
    quiz_topic: str | None,
    score_percentage: float,
    performance_level: str,
    incorrect_items: list[IncorrectItem],
    chunks: list[str],
) -> str | None:
    """Returns a feedback paragraph, or None if generation failed.

    Feedback is enrichment, not the critical path — grading must never
    fail just because this did, so callers should treat None as
    "skip it" rather than an error.
    """
    if not incorrect_items:
        return "Perfect score! You've got a strong grasp of this material — nothing to review here."

    prompt = build_feedback_prompt(
        quiz_topic, score_percentage, performance_level, incorrect_items, chunks
    )

    try:
        response = _model.generate_content(prompt)
        text = response.text.strip()
        return text or None
    except Exception as e:  # noqa: BLE001 - any AI-call failure just means no feedback this time
        logger.warning("AI feedback generation failed: %s", e)
        return None
