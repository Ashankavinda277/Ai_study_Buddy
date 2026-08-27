import os
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
from pypdf import PdfReader
from app.db.session import get_db
from app.models import Document, DocumentChunk
from app.utils.text_processing import clean_text, chunk_text
from app.vector_store import add_chunk_to_vector_store

router = APIRouter(prefix="/documents", tags=["documents"])

UPLOAD_DIR = "uploaded_files"
ALLOWED_TYPES = ["application/pdf"]
MAX_SIZE_MB = 20

@router.post("/upload")
async def upload_document(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    content = await file.read()
    size_mb = len(content) / (1024 * 1024)

    if size_mb > MAX_SIZE_MB:
        raise HTTPException(status_code=400, detail=f"File too large (max {MAX_SIZE_MB}MB)")

    doc_id = str(uuid.uuid4())
    safe_filename = f"{doc_id}_{file.filename}"
    filepath = os.path.join(UPLOAD_DIR, safe_filename)

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    with open(filepath, "wb") as f:
        f.write(content)

    document = Document(
        id=doc_id,
        filename=file.filename,
        filepath=filepath,
        status="pending",
        size_bytes=len(content),
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    return {
        "id": document.id,
        "filename": document.filename,
        "status": document.status,
        "size_bytes": document.size_bytes,
    }

@router.post("/{document_id}/process")
def process_document(document_id: str, db: Session = Depends(get_db)):
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    try:
        document.status = "processing"
        db.commit()

        reader = PdfReader(document.filepath)

        # Delete old chunks if reprocessing
        db.query(DocumentChunk).filter(DocumentChunk.document_id == document_id).delete()

        sequence = 0
        for page_num, page in enumerate(reader.pages, start=1):
            raw_text = page.extract_text() or ""
            cleaned = clean_text(raw_text)
            if not cleaned:
                continue

            page_chunks = chunk_text(cleaned)
            for chunk in page_chunks:
                db_chunk = DocumentChunk(
                    document_id=document_id,
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
                        "document_id": document_id,
                        "page_number": page_num,
                        "filename": document.filename,
                    },
                )
                sequence += 1

        document.status = "ready"
        db.commit()

        total_chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == document_id).count()

        return {
            "id": document.id,
            "status": document.status,
            "total_chunks": total_chunks,
        }

    except Exception as e:
        document.status = "failed"
        document.processing_error = str(e)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

@router.get("")
def list_documents(db: Session = Depends(get_db)):
    documents = db.query(Document).all()
    return [
        {
            "id": doc.id,
            "filename": doc.filename,
            "status": doc.status,
            "size_bytes": doc.size_bytes,
            "created_at": doc.created_at,
        }
        for doc in documents
    ]

import os

@router.delete("/{document_id}")
def delete_document(document_id: str, db: Session = Depends(get_db)):
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Remove file from disk if it exists
    if os.path.exists(document.filepath):
        os.remove(document.filepath)

    db.delete(document)
    db.commit()

    return {"message": f"Document {document_id} deleted successfully"}