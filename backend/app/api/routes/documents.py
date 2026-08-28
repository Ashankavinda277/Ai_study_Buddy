from fastapi import APIRouter, UploadFile, File, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.document import DocumentResponse, DocumentProcessResponse, DocumentDeleteResponse
from app.services import document_services

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/upload", response_model=DocumentResponse)
async def upload_document(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    return document_services.save_uploaded_document(db, file.filename, file.content_type, content)


@router.post("/{document_id}/process", response_model=DocumentProcessResponse)
def process_document(document_id: str, db: Session = Depends(get_db)):
    document = document_services.get_document_or_404(db, document_id)
    document, total_chunks = document_services.process_document(db, document)
    return DocumentProcessResponse(id=document.id, status=document.status, total_chunks=total_chunks)


@router.get("", response_model=list[DocumentResponse])
def list_documents(db: Session = Depends(get_db)):
    return document_services.list_all_documents(db)


@router.delete("/{document_id}", response_model=DocumentDeleteResponse)
def delete_document(document_id: str, db: Session = Depends(get_db)):
    document = document_services.get_document_or_404(db, document_id)
    document_services.delete_document(db, document)
    return DocumentDeleteResponse(message=f"Document {document_id} deleted successfully")
