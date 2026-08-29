# syntax=docker/dockerfile:1

FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY requirements.txt .

# No special index needed: embeddings come from the Gemini API, so torch and
# sentence-transformers are gone. psycopg2-binary ships as a wheel, so there is
# no compiler or libpq-dev to install either.
RUN pip install -r requirements.txt

COPY . .

RUN mkdir -p uploaded_files \
 && useradd --create-home --uid 1000 app \
 && chown -R app:app /app
USER app

EXPOSE 8000

# Migrations run on boot so a fresh database provisions itself. If a migration
# fails the container exits non-zero rather than serving against a bad schema.
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
