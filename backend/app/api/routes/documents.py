import os
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
from pypdf import PdfReader
from app.db.session import get_db
from app.models.document import Document

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
        extracted_text = ""
        for page in reader.pages:
            extracted_text += (page.extract_text() or "") + "\n"

        document.status = "ready"
        db.commit()

        return {
            "id": document.id,
            "status": document.status,
            "text_preview": extracted_text[:500],  # just show first 500 chars for now
            "total_characters": len(extracted_text),
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