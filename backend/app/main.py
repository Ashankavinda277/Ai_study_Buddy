from fastapi import FastAPI
from .api.routes import documents, chat

app = FastAPI(title="AI Study Buddy API")
app.include_router(documents.router)
app.include_router(chat.router)

@app.get("/health")
def health_check():
    return {"status": "ok"}