from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import attempts, auth, chat, documents, quizzes

app = FastAPI(title="AI Study Buddy API")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],  # Next.js frontend (dev)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all API routers
app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(chat.router)
app.include_router(quizzes.router)
app.include_router(attempts.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}