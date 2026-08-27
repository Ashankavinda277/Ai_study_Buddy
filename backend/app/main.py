from fastapi import FastAPI
from .api.routes import documents

app = FastAPI(title="AI Study Buddy API")
app.include_router(documents.router)

@app.get("/health")
def health_check():
    return {"status": "ok"}