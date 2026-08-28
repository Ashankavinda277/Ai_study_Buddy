import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.api.routes import attempts, auth, chat, documents, quizzes

logger = logging.getLogger("uvicorn.error")

app = FastAPI(title="AI Study Buddy API")


class CatchAllExceptionMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        try:
            return await call_next(request)
        except Exception:
            logger.exception("Unhandled exception")
            return JSONResponse(status_code=500, content={"detail": "Internal server error"})


# Must be added *before* CORSMiddleware: Starlette's add_middleware nests each
# new middleware inside the previous ones, so registering this first puts it
# inside CORSMiddleware -- meaning a response built here still passes back
# out through CORS and gets its headers. Reversing the order (or using
# @app.exception_handler(Exception), which Starlette special-cases onto
# ServerErrorMiddleware, entirely outside user middleware) silently drops the
# CORS headers on any unhandled exception, which the browser then reports as
# a generic network failure ("Failed to fetch") instead of the real error.
app.add_middleware(CatchAllExceptionMiddleware)

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