from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.chat import (
    AskRequest,
    AskResponse,
    ChatHistoryResponse,
    ChatSessionDeleteResponse,
    ChatSessionSummary,
)
from app.services import chat_services

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/ask", response_model=AskResponse)
def ask_question(request: AskRequest, db: Session = Depends(get_db)):
    session = chat_services.get_or_create_session(
        db, request.session_id, request.document_id, request.question
    )
    answer, sources = chat_services.answer_question(request.question)
    chat_services.save_chat_turn(db, session, request.question, answer, sources)

    return AskResponse(session_id=session.id, answer=answer, sources=sources)


@router.get("/sessions", response_model=list[ChatSessionSummary])
def list_chat_sessions(document_id: str | None = None, db: Session = Depends(get_db)):
    return chat_services.list_chat_sessions(db, document_id)


@router.get("/sessions/{session_id}", response_model=ChatHistoryResponse)
def get_chat_history(session_id: str, db: Session = Depends(get_db)):
    messages = chat_services.get_session_history(db, session_id)
    return ChatHistoryResponse(session_id=session_id, messages=messages)


@router.delete("/sessions/{session_id}", response_model=ChatSessionDeleteResponse)
def delete_chat_session(session_id: str, db: Session = Depends(get_db)):
    session = chat_services.get_session_or_404(db, session_id)
    chat_services.delete_chat_session(db, session)
    return ChatSessionDeleteResponse(message=f"Chat session {session_id} deleted successfully")

