"""Stand-in for Member 1's document/retrieval service.

Two functions only, mirroring the API contract in
docs/api-contracts/retrieval-api.md: list_documents() and
search_chunks(). Both return hardcoded fake data today, so quiz
configuration and generation can be built and tested without waiting
on Member 1's real endpoints.

When Member 1's endpoints are ready, only this file changes — nothing
else in the app should ever call Member 1's API directly.
"""

from dataclasses import dataclass


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


_FAKE_DOCUMENTS = [
    RetrievedDocument(id="doc-fake-1", filename="Database Systems - Chapter 4.pdf", status="ready"),
    RetrievedDocument(id="doc-fake-2", filename="Intro to Networking.pdf", status="ready"),
    RetrievedDocument(id="doc-fake-3", filename="Operating Systems Notes.pdf", status="processing"),
]

_FAKE_CHUNKS = [
    RetrievedChunk(
        text="Normalization is the process of organizing data to reduce redundancy.",
        page=12,
        document_id="doc-fake-1",
    ),
    RetrievedChunk(
        text="A primary key uniquely identifies each row in a table and cannot be null.",
        page=15,
        document_id="doc-fake-1",
    ),
    RetrievedChunk(
        text="TCP provides reliable, ordered delivery of a stream of bytes between hosts.",
        page=4,
        document_id="doc-fake-2",
    ),
]


def list_documents(user_id: int) -> list[RetrievedDocument]:
    """Documents available to the given user for building a quiz from.

    Real contract (proposed, see docs/api-contracts/retrieval-api.md):
    GET /documents, scoped to the authenticated user, returning
    {id, filename, status}. Stubbed here with fake data until that's
    confirmed with Member 1.
    """
    return _FAKE_DOCUMENTS


def search_chunks(document_id: str, query: str, top_k: int = 8) -> list[RetrievedChunk]:
    """Relevant chunks of a document's content for a given topic/query.

    Real contract (proposed): POST /retrieval/search
        Request:  {"document_id": ..., "query": ..., "top_k": ...}
        Response: {"chunks": [{"text": ..., "page": ..., "document_id": ...}]}
    Stubbed here with fake data in the same shape the real response
    will have, so this function's return type won't need to change
    when it's wired up for real.
    """
    matches = [chunk for chunk in _FAKE_CHUNKS if chunk.document_id == document_id]
    return matches[:top_k]
