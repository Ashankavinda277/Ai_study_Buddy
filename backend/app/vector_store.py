import os

import chromadb
from sentence_transformers import SentenceTransformer

CHROMA_HOST = os.getenv("CHROMA_HOST", "localhost")
CHROMA_PORT = int(os.getenv("CHROMA_PORT", "8001"))
COLLECTION_NAME = "document_chunks"

# Both the embedding model and the Chroma client are created lazily rather than
# at import time. Connecting at import meant a Chroma outage stopped the whole
# API from starting -- including /health and the auth routes, which don't use
# vectors at all.
_embedding_model = None
_client = None


def _get_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        # Local embedding model - runs on your CPU, completely free
        _embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
    return _embedding_model


def _get_client():
    global _client
    if _client is None:
        _client = chromadb.HttpClient(host=CHROMA_HOST, port=CHROMA_PORT)
    return _client


def get_collection():
    """Resolve the collection fresh on each call.

    Holding a long-lived collection object breaks as soon as the Chroma
    container is restarted or recreated: the cached handle still points at the
    previous instance, so every later call fails until the API is restarted.
    """
    global _client
    try:
        return _get_client().get_or_create_collection(name=COLLECTION_NAME)
    except Exception:
        # Chroma probably restarted -- drop the cached client and retry once.
        _client = None
        return _get_client().get_or_create_collection(name=COLLECTION_NAME)


def embed_text(text: str):
    return _get_embedding_model().encode(text).tolist()


def add_chunk_to_vector_store(chunk_id: str, chunk_text: str, metadata: dict):
    embedding = embed_text(chunk_text)
    get_collection().add(
        ids=[chunk_id],
        embeddings=[embedding],
        documents=[chunk_text],
        metadatas=[metadata],
    )


def delete_chunks_for_document(document_id: str):
    get_collection().delete(where={"document_id": document_id})


def search_similar_chunks(query: str, n_results: int = 5):
    query_embedding = embed_text(query)
    results = get_collection().query(
        query_embeddings=[query_embedding],
        n_results=n_results,
    )
    return results
