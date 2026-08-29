import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(
    DATABASE_URL,
    # Serverless Postgres (Neon and similar) suspends compute after a few
    # minutes idle, which kills every connection in the pool. Without a
    # pre-ping the pool hands out a dead socket on the next request and it
    # surfaces as an intermittent "SSL connection has been closed unexpectedly".
    pool_pre_ping=True,
    pool_recycle=300,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()