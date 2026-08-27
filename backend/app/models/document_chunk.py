import uuid
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from ..db.database import Base


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String, ForeignKey("documents.id"), nullable=False)
    chunk_text = Column(Text, nullable=False)
    page_number = Column(Integer, nullable=True)
    sequence = Column(Integer, nullable=False)
    vector_id = Column(String, nullable=True)  # will link to ChromaDB entry later
    created_at = Column(DateTime(timezone=True), server_default=func.now())