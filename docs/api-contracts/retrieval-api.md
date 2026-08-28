# Retrieval API contract — Member 1 (documents/RAG) ↔ Member 2 (quizzes)

Status: **implemented and working**, using direct in-process calls
rather than the HTTP endpoint originally proposed below (turned out
simpler, since both parts run in the same FastAPI app — see "What
actually shipped"). One real gap remains: `list_documents` isn't
scoped per-user yet.

## What actually shipped

`app/services/retrieval_client.py` (Member 2's file — this is still
the only file that touches Member 1's storage) calls Member 1's
existing building blocks directly:

- **`list_documents(db, user_id)`** — queries the `documents` table
  directly (`db.query(Document)...`). No new endpoint needed.
- **`search_chunks(document_id, query, top_k)`** — calls
  `embed_text()` and the Chroma `collection` from `app/vector_store.py`
  directly, with a `where={"document_id": ...}` filter. Member 1's own
  `search_similar_chunks()` wrapper in that file searches the *whole*
  collection with no document filter, so this bypasses that wrapper
  and queries Chroma directly instead — nothing in `vector_store.py`
  needed to change.

Verified end-to-end: uploaded a real PDF through
`POST /documents/upload` → `POST /documents/{id}/process`, generated a
quiz from it with real Gemini calls, and every question/answer/
explanation was correctly grounded in the source document.

## Remaining gap: per-user document scoping

`list_documents()` currently returns **every** document in the table,
regardless of who's asking — `Document.owner_id` exists as a column
but is never set on upload (`document_services.save_uploaded_document`
doesn't take a user, and `POST /documents/upload` isn't behind auth).

Two small changes would close this:
1. `POST /documents/upload` needs to require auth and set
   `Document.owner_id = current_user.id`.
2. `retrieval_client.list_documents()` adds
   `.filter(Document.owner_id == user_id)` — one-line change, already
   set up to receive `user_id`.

Not urgent (nothing is broken, just not private per-user yet), but
worth doing before this goes anywhere near real users.

## Superseded: original HTTP-endpoint proposal

The original version of this doc proposed a `POST /retrieval/search`
endpoint. That's no longer needed — since quiz generation lives in the
same backend process as the document/vector-store code, a direct
Python function call is simpler and has no network hop, no duplicate
auth layer, and no serialization overhead. Keeping this note here in
case a future split into separate services ever revives the need for
a real HTTP contract — the request/response shapes below are still a
reasonable starting point if that happens:

```json
// Request
{ "document_id": "uuid-string", "query": "database normalization", "top_k": 8 }
// Response
{ "chunks": [{ "text": "...", "page": 12, "document_id": "uuid-string" }] }
```
