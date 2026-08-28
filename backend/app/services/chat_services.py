import json

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.llm import generate_grounded_answer
from app.models import ChatMessage, ChatSession
from app.vector_store import search_similar_chunks


def get_or_create_session(
    db: Session, session_id: str | None, document_id: str | None, title_seed: str
) -> ChatSession:
    if session_id:
        session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
        if session is None:
            raise HTTPException(status_code=404, detail="Chat session not found")
        return session

    session = ChatSession(document_id=document_id, title=title_seed[:50])
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def answer_question(question: str) -> tuple[str, list[dict]]:
    results = search_similar_chunks(question, n_results=5)
    chunks = results["documents"][0]
    metadatas = results["metadatas"][0]

    if not chunks:
        return "I couldn't find any relevant information in your notes.", []

    answer = generate_grounded_answer(question, chunks)

    # Dedupe sources by (filename, page_number)
    seen = set()
    sources = []
    for meta in metadatas:
        key = (meta["filename"], meta["page_number"])
        if key not in seen:
            seen.add(key)
            sources.append({"filename": meta["filename"], "page_number": meta["page_number"]})

    return answer, sources


def save_chat_turn(db: Session, session: ChatSession, question: str, answer: str, sources: list[dict]) -> None:
    user_msg = ChatMessage(session_id=session.id, role="user", content=question)
    db.add(user_msg)

    assistant_msg = ChatMessage(
        session_id=session.id,
        role="assistant",
        content=answer,
        sources=json.dumps(sources),
    )
    db.add(assistant_msg)
    db.commit()


def get_session_history(db: Session, session_id: str) -> list[dict]:
    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
        .all()
    )
    return [
        {
            "role": msg.role,
            "content": msg.content,
            "sources": json.loads(msg.sources) if msg.sources else None,
            "created_at": msg.created_at,
        }
        for msg in messages
    ]


def get_session_or_404(db: Session, session_id: str) -> ChatSession:
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return session


def delete_chat_session(db: Session, session: ChatSession) -> None:
    db.query(ChatMessage).filter(ChatMessage.session_id == session.id).delete()
    db.delete(session)
    db.commit()
