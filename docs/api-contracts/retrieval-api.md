# Retrieval API contract — Member 1 (documents/RAG) ↔ Member 2 (quizzes)

Status: **draft, needs Member 1's sign-off.** Until agreed, Member 2's
`app/services/retrieval_client.py` returns hardcoded fake data matching
the shapes below, so quiz configuration/generation can be built and
tested without blocking on this.

## 1. List available documents

**This may already exist.** `GET /documents` (`backend/app/api/routes/documents.py`)
currently returns:

```json
[
  { "id": "uuid-string", "filename": "notes.pdf", "status": "ready", "size_bytes": 123456, "created_at": "2026-08-28T10:00:00Z" }
]
```

Two things need to change before Member 2 can call it directly:

1. **Scope it to the logged-in user.** Right now it returns every
   document in the table, with no auth check. `Document.owner_id`
   already exists as a column (currently unused, `nullable=True`) —
   it should be set to the uploader's user id on `POST /documents/upload`,
   and `GET /documents` should filter `WHERE owner_id = current_user.id`.
2. `status` values should be exactly one of: `pending`, `processing`,
   `ready`, `failed` — quiz generation will only offer documents with
   `status == "ready"` in the picker.

If both of those land, Member 2 can drop the fake data in
`retrieval_client.list_documents()` and call `GET /documents` directly.

## 2. Search relevant chunks (needed, doesn't exist yet)

**New endpoint: `POST /retrieval/search`**

Request:
```json
{
  "document_id": "uuid-string",
  "query": "database normalization",
  "top_k": 8
}
```

Response:
```json
{
  "chunks": [
    { "text": "Normalization is the process...", "page": 12, "document_id": "uuid-string" }
  ]
}
```

Notes:
- `query` will usually be the quiz topic the student typed in (or a
  generic "overview" query if they chose "entire document").
- `top_k` defaults to 8 on Member 2's side; happy to adjust once we
  know what a good default chunk count is for prompt size.
- `page` should be `null` if page numbers aren't tracked for that
  chunk, not omitted — Member 2's schema expects the key to exist.
- Auth: this will be called server-to-server from Member 2's backend,
  not directly from the browser. Does it need its own auth check
  (e.g. verify `document_id` belongs to the requesting user), or is
  that assumed to already be enforced by whoever calls it? Needs an
  answer before this ships.

## 3. What changes on Member 2's side once this is agreed

Only `backend/app/services/retrieval_client.py` — its two functions
(`list_documents`, `search_chunks`) get their fake-data bodies replaced
with real HTTP calls (or direct function calls, if we end up in the
same process) to the endpoints above. Every other file that uses quiz
generation calls `retrieval_client`, never Member 1's endpoints
directly, so nothing else needs to change.

## Open questions for Member 1

- [ ] Can `GET /documents` be scoped to `owner_id` this week?
- [ ] Is `POST /retrieval/search` feasible before Feature 3 (AI quiz
      generation) starts, or should Member 2 plan to stay on fake data
      longer?
- [ ] Auth model for `POST /retrieval/search` (see note above).
- [ ] Confirm the four `status` values above are the full set.
