import math
import os

import chromadb
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

CHROMA_HOST = os.getenv("CHROMA_HOST", "localhost")
CHROMA_PORT = int(os.getenv("CHROMA_PORT", "8001"))
COLLECTION_NAME = "document_chunks"

# Embeddings come from the Gemini API rather than a local sentence-transformers
# model. The local model pulled in torch + transformers + scipy + scikit-learn:
# ~1GB of image and ~470MB of resident memory, which does not fit a small
# container. This is a network call instead, so it is subject to API rate
# limits, but it keeps the service small enough to host cheaply.
EMBED_MODEL = "models/gemini-embedding-001"

# The model's native width is 3072. 768 is plenty for this corpus and keeps the
# Chroma collection roughly a quarter of the size.
EMBED_DIM = 768

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# The Chroma client is created lazily rather than at import time. Connecting at
# import meant a Chroma outage stopped the whole API from starting -- including
# /health and the auth routes, which don't use vectors at all.
_client = None


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


def _normalize(vector: list[float]) -> list[float]:
    """Scale a vector to unit length.

    gemini-embedding-001 returns unit vectors at its native 3072 dimensions,
    but a truncated output is NOT normalized -- a 768-dim response measures
    ~0.57. Chroma ranks by L2 distance, so feeding it vectors of varying
    magnitude skews every similarity result. This fails silently: retrieval
    still returns chunks, just the wrong ones.
    """
    norm = math.sqrt(sum(component * component for component in vector))
    return [component / norm for component in vector] if norm else vector


def embed_text(text: str) -> list[float]:
    result = genai.embed_content(
        model=EMBED_MODEL,
        content=text,
        output_dimensionality=EMBED_DIM,
    )
    return _normalize(result["embedding"])


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
