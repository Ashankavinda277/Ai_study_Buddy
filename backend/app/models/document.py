from sqlalchemy import Column, String, Integer, Text, DateTime
from sqlalchemy.sql import func
import uuid
from ..db.database import Base

class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    owner_id = Column(String, nullable=True)  # will link to Member 2's User table later
    filename = Column(String, nullable=False)
    filepath = Column(String, nullable=False)
    status = Column(String, default="pending")  # pending, processing, ready, failed
    size_bytes = Column(Integer)
    processing_error = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())