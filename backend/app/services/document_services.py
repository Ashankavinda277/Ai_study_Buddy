import os
import uuid

from fastapi import HTTPException
from pypdf import PdfReader
from sqlalchemy.orm import Session

from app.models import ChatMessage, ChatSession, Document, DocumentChunk
from app.utils.text_processing import clean_text, chunk_text
from app.vector_store import add_chunk_to_vector_store, delete_chunks_for_document

UPLOAD_DIR = "uploaded_files"
ALLOWED_TYPES = ["application/pdf"]
MAX_SIZE_MB = 20


def save_uploaded_document(db: Session, filename: str, content_type: str, content: bytes) -> Document:
    if content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    size_mb = len(content) / (1024 * 1024)
    if size_mb > MAX_SIZE_MB:
        raise HTTPException(status_code=400, detail=f"File too large (max {MAX_SIZE_MB}MB)")

    doc_id = str(uuid.uuid4())
    safe_filename = f"{doc_id}_{filename}"
    filepath = os.path.join(UPLOAD_DIR, safe_filename)

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    with open(filepath, "wb") as f:
        f.write(content)

    document = Document(
        id=doc_id,
        filename=filename,
        filepath=filepath,
        status="pending",
        size_bytes=len(content),
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return document


def get_document_or_404(db: Session, document_id: str) -> Document:
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return document


def process_document(db: Session, document: Document) -> tuple[Document, int]:
    try:
        document.status = "processing"
        db.commit()

        reader = PdfReader(document.filepath)

        # Delete old chunks if reprocessing
        db.query(DocumentChunk).filter(DocumentChunk.document_id == document.id).delete()

        sequence = 0
        for page_num, page in enumerate(reader.pages, start=1):
            raw_text = page.extract_text() or ""
            cleaned = clean_text(raw_text)
            if not cleaned:
                continue

            page_chunks = chunk_text(cleaned)
            for chunk in page_chunks:
                db_chunk = DocumentChunk(
                    document_id=document.id,
                    chunk_text=chunk,
                    page_number=page_num,
                    sequence=sequence,
                )
                db.add(db_chunk)
                db.flush()  # so db_chunk.id is available before commit

                add_chunk_to_vector_store(
                    chunk_id=db_chunk.id,
                    chunk_text=chunk,
                    metadata={
                        "document_id": document.id,
                        "page_number": page_num,
                        "filename": document.filename,
                    },
                )
                sequence += 1

        document.status = "ready"
        db.commit()

        total_chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == document.id).count()
        return document, total_chunks

    except Exception as e:
        document.status = "failed"
        document.processing_error = str(e)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")


def list_all_documents(db: Session) -> list[Document]:
    return db.query(Document).all()


def delete_document(db: Session, document: Document) -> None:
    session_ids = [
        row.id
        for row in db.query(ChatSession.id).filter(ChatSession.document_id == document.id).all()
    ]
    if session_ids:
        db.query(ChatMessage).filter(ChatMessage.session_id.in_(session_ids)).delete()
        db.query(ChatSession).filter(ChatSession.id.in_(session_ids)).delete()

    db.query(DocumentChunk).filter(DocumentChunk.document_id == document.id).delete()
    delete_chunks_for_document(document.id)

    if os.path.exists(document.filepath):
        os.remove(document.filepath)

    db.delete(document)
    db.commit()
