from app.vector_store import search_similar_chunks

results = search_similar_chunks("What is the recommended technology stack?")
print(results)