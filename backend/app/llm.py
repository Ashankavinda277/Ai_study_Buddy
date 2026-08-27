import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-3.6-flash")  # fast + free-tier friendly

def generate_grounded_answer(question: str, context_chunks: list[str]) -> str:
    context_text = "\n\n---\n\n".join(context_chunks)

    prompt = f"""You are a study assistant. Answer the question using ONLY the context below.
If the context does not contain enough information to answer, say clearly that the notes don't cover this.
Do not make up information that isn't in the context.

Context:
{context_text}

Question: {question}

Answer:"""

    response = model.generate_content(prompt)
    return response.text