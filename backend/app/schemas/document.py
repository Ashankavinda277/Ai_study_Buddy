from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    filename: str
    status: str
    size_bytes: int
    created_at: datetime


class DocumentProcessResponse(BaseModel):
    id: str
    status: str
    total_chunks: int


class DocumentDeleteResponse(BaseModel):
    message: str
