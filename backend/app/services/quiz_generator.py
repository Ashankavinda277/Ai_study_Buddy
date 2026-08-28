"""AI-based quiz generation (Feature 3) and its validation (Feature 4).

Flow: retrieve chunks -> build prompt -> call Gemini with JSON mode ->
parse -> validate with Pydantic -> run business-rule checks -> retry
once on failure -> raise QuizGenerationError if still invalid.

Deliberately separate from app/llm.py (Member 1's file, used for the
chat feature) — this uses its own GenerativeModel instance configured
for structured JSON output, so quiz generation never depends on or
interferes with Member 1's chat prompt/config.
"""

import json
import logging
import os

import google.generativeai as genai
from dotenv import load_dotenv
from pydantic import ValidationError

from app.schemas.quiz_generation import AIQuizResponse, find_validation_errors
from app.services import retrieval_client

load_dotenv()

logger = logging.getLogger(__name__)

MAX_ATTEMPTS = 2

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
_model = genai.GenerativeModel("gemini-3.6-flash")


class QuizGenerationError(Exception):
    """Raised when the AI couldn't produce a valid quiz after retrying."""


def build_prompt(chunks: list[str], topic: str | None, difficulty: str, question_count: int) -> str:
    context = "\n\n---\n\n".join(chunks)
    topic_line = (
        f'Focus specifically on the topic: "{topic}".'
        if topic
        else "Cover the document as a whole."
    )

    return f"""You are generating a multiple-choice quiz for a student, based ONLY on the study notes provided below.

{topic_line}
Difficulty: {difficulty}
Generate exactly {question_count} multiple-choice questions.

Rules:
- Use ONLY the information in the notes below. Do not use outside knowledge.
- Each question must have exactly 4 options.
- Exactly one option must be correct.
- "correct_answer" is the 0-based index (0, 1, 2, or 3) of the correct option.
- Give a short explanation for the correct answer, grounded in the notes.
- Do not repeat the same question twice.
- Every question, option, and explanation must be non-empty text.
- "difficulty" on every question must be exactly "{difficulty}".
- Return ONLY valid JSON matching this exact schema — no markdown, no extra text before or after it:

{{
  "title": "string",
  "questions": [
    {{
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "correct_answer": 0,
      "explanation": "string",
      "topic": "string",
      "difficulty": "{difficulty}",
      "source_page": null
    }}
  ]
}}

Study notes:
{context}
"""


def _call_ai(prompt: str) -> str:
    response = _model.generate_content(
        prompt,
        generation_config={"response_mime_type": "application/json"},
    )
    return response.text


def _parse_and_validate(raw_text: str, expected_question_count: int) -> tuple[AIQuizResponse | None, list[str]]:
    try:
        data = json.loads(raw_text)
    except json.JSONDecodeError as e:
        return None, [f"AI response was not valid JSON: {e}"]

    try:
        quiz = AIQuizResponse.model_validate(data)
    except ValidationError as e:
        return None, [str(e)]

    errors = find_validation_errors(quiz, expected_question_count)
    if errors:
        return None, errors

    return quiz, []


def generate_quiz_content(
    document_id: str,
    topic: str | None,
    difficulty: str,
    question_count: int,
) -> AIQuizResponse:
    """Retrieves context, calls the AI, and returns a validated quiz.

    Raises QuizGenerationError if the AI's response still doesn't pass
    validation after one retry, or if there's no content to generate
    questions from in the first place.
    """
    query = topic or "overview of the document"
    chunks = retrieval_client.search_chunks(document_id, query, top_k=8)
    if not chunks:
        raise QuizGenerationError(
            "No content found for this document" + (f' and topic "{topic}"' if topic else "") + "."
        )

    prompt = build_prompt([c.text for c in chunks], topic, difficulty, question_count)

    errors: list[str] = []
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            raw_text = _call_ai(prompt)
        except Exception as e:  # noqa: BLE001 - any AI-call failure (bad key, network, rate limit) is retried the same as a bad response
            errors = [f"AI call failed: {e}"]
            logger.warning("AI quiz generation attempt %d/%d raised: %s", attempt, MAX_ATTEMPTS, e)
            continue

        quiz, errors = _parse_and_validate(raw_text, question_count)
        if quiz is not None:
            return quiz
        logger.warning("AI quiz generation attempt %d/%d failed: %s", attempt, MAX_ATTEMPTS, errors)

    raise QuizGenerationError(
        f"AI response failed validation after {MAX_ATTEMPTS} attempts: {'; '.join(errors)}"
    )
