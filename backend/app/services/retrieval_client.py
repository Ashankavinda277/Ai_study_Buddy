"""Bridge to Member 1's document/retrieval pipeline.

Two functions only: list_documents() and search_chunks(). This is the
only file that talks to Member 1's storage (Postgres `documents` table
and the Chroma vector store) — every other file (routes, quiz
generation) calls these two functions and never touches
app.vector_store or app.models.document directly. That's what made it
possible to build and test the quiz configuration form (Step 2) before
this was wired up for real, and it's what keeps future changes to
Member 1's pipeline contained to this one file.

Note: Member 1's own `search_similar_chunks()` in app/vector_store.py
searches the *entire* Chroma collection with no document filter, which
isn't usable for "generate a quiz from this one document". So
search_chunks() below calls Chroma directly (via the same `collection`
and `embed_text()` Member 1 already built) with a `where` filter on
document_id, instead of going through their wrapper.
"""

from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.models.document import Document
from app.vector_store import collection, embed_text


@dataclass
class RetrievedDocument:
    id: str
    filename: str
    status: str  # pending, processing, ready, failed


@dataclass
class RetrievedChunk:
    text: str
    page: int | None
    document_id: str


def list_documents(db: Session, user_id: int) -> list[RetrievedDocument]:
    """Documents available to build a quiz from.

    Not yet scoped to `user_id` — `Document.owner_id` isn't populated by
    the upload endpoint yet (see docs/api-contracts/retrieval-api.md).
    Until that lands, every user sees every uploaded document.
    """
    documents = db.query(Document).order_by(Document.created_at.desc()).all()
    return [
        RetrievedDocument(id=doc.id, filename=doc.filename, status=doc.status)
        for doc in documents
    ]


def search_chunks(document_id: str, query: str, top_k: int = 8) -> list[RetrievedChunk]:
    """Relevant chunks of one document's content for a given topic/query."""
    query_embedding = embed_text(query)
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
        where={"document_id": document_id},
    )

    documents = results["documents"][0] if results.get("documents") else []
    metadatas = results["metadatas"][0] if results.get("metadatas") else []

    return [
        RetrievedChunk(
            text=text,
            page=metadata.get("page_number"),
            document_id=document_id,
        )
        for text, metadata in zip(documents, metadatas)
    ]
