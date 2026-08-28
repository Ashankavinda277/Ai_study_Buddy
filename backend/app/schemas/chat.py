from datetime import datetime

from pydantic import BaseModel


class AskRequest(BaseModel):
    question: str
    document_id: str | None = None  # optional: limit search to one document
    session_id: str | None = None  # optional: continue a previous chat session


class SourceItem(BaseModel):
    filename: str
    page_number: int | None = None


class AskResponse(BaseModel):
    session_id: str
    answer: str
    sources: list[SourceItem]


class ChatMessageResponse(BaseModel):
    role: str
    content: str
    sources: list[SourceItem] | None = None
    created_at: datetime


class ChatHistoryResponse(BaseModel):
    session_id: str
    messages: list[ChatMessageResponse]


class ChatSessionDeleteResponse(BaseModel):
    message: str
