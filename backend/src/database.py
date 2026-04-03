import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

load_dotenv()

_db_url = os.environ.get("DATABASE_URL")
if not _db_url:
    raise RuntimeError("DATABASE_URL environment variable is not set")

engine = create_engine(
    _db_url,
    pool_pre_ping=True,   # recycle stale connections before use
    pool_size=5,
    max_overflow=10,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
