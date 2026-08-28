import chromadb
from sentence_transformers import SentenceTransformer

# Local embedding model - runs on your CPU, completely free
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")

# Connect to the ChromaDB container
chroma_client = chromadb.HttpClient(host="localhost", port=8001)

collection = chroma_client.get_or_create_collection(name="document_chunks")

def embed_text(text: str):
    return embedding_model.encode(text).tolist()

def add_chunk_to_vector_store(chunk_id: str, chunk_text: str, metadata: dict):
    embedding = embed_text(chunk_text)
    collection.add(
        ids=[chunk_id],
        embeddings=[embedding],
        documents=[chunk_text],
        metadatas=[metadata],
    )

def search_similar_chunks(query: str, n_results: int = 5):
    query_embedding = embed_text(query)
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=n_results,
    )
    return results