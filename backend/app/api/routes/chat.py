from fastapi import APIRouter
from pydantic import BaseModel
from app.vector_store import search_similar_chunks
from app.llm import generate_grounded_answer

router = APIRouter(prefix="/chat", tags=["chat"])

class AskRequest(BaseModel):
    question: str
    document_id: str | None = None  # optional: limit search to one document

@router.post("/ask")
def ask_question(request: AskRequest):
    results = search_similar_chunks(request.question, n_results=5)

    chunks = results["documents"][0]
    metadatas = results["metadatas"][0]

    if not chunks:
        return {
            "answer": "I couldn't find any relevant information in your notes.",
            "sources": [],
        }

    answer = generate_grounded_answer(request.question, chunks)

    sources = [
        {
            "filename": meta["filename"],
            "page_number": meta["page_number"],
        }
        for meta in metadatas
    ]

    return {
        "answer": answer,
        "sources": sources,
    }