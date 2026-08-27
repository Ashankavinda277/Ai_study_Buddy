import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.vector_store import search_similar_chunks
from app.llm import generate_grounded_answer
from app.models import ChatSession, ChatMessage
from app.db.session import get_db

router = APIRouter(prefix="/chat", tags=["chat"])

class AskRequest(BaseModel):
    question: str
    document_id: str | None = None  # optional: limit search to one document
    session_id: str | None = None  # optional: continue a previous chat session


@router.post("/ask")
def ask_question(request: AskRequest, db: Session = Depends(get_db)):
    # Get or create the chat session
    if request.session_id:
        session = db.query(ChatSession).filter(ChatSession.id == request.session_id).first()
        if session is None:
            raise HTTPException(status_code=404, detail="Chat session not found")
    else:
        session = ChatSession(document_id=request.document_id, title=request.question[:50])
        db.add(session)
        db.commit()
        db.refresh(session)

    # Retrieve relevant chunks
    results = search_similar_chunks(request.question, n_results=5)
    chunks = results["documents"][0]
    metadatas = results["metadatas"][0]

    if not chunks:
        answer = "I couldn't find any relevant information in your notes."
        sources = []
    else:
        answer = generate_grounded_answer(request.question, chunks)
        # Dedupe sources by (filename, page_number)
        seen = set()
        sources = []
        for meta in metadatas:
            key = (meta["filename"], meta["page_number"])
            if key not in seen:
                seen.add(key)
                sources.append({"filename": meta["filename"], "page_number": meta["page_number"]})

    # Save user question
    user_msg = ChatMessage(session_id=session.id, role="user", content=request.question)
    db.add(user_msg)

    # Save assistant answer
    assistant_msg = ChatMessage(
        session_id=session.id,
        role="assistant",
        content=answer,
        sources=json.dumps(sources),
    )
    db.add(assistant_msg)
    db.commit()

    return {
        "session_id": session.id,
        "answer": answer,
        "sources": sources,
    }

@router.get("/sessions/{session_id}")
def get_chat_history(session_id: str, db: Session = Depends(get_db)):
    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
        .all()
    )

    return {
        "session_id": session_id,
        "messages": [
            {
                "role": msg.role,
                "content": msg.content,
                "sources": json.loads(msg.sources) if msg.sources else None,
                "created_at": msg.created_at,
            }
            for msg in messages
        ],
    }

@router.delete("/sessions/{session_id}")
def delete_chat_session(session_id: str, db: Session = Depends(get_db)):
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    # Delete all messages belonging to this session first
    db.query(ChatMessage).filter(ChatMessage.session_id == session_id).delete()

    # Then delete the session itself
    db.delete(session)
    db.commit()

    return {"message": f"Chat session {session_id} deleted successfully"}