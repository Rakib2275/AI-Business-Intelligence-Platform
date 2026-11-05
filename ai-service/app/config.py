
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv(override=False)

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
AI_SERVICE_API_KEY = os.getenv("AI_SERVICE_API_KEY", "")

engine = create_engine(DATABASE_URL, pool_pre_ping=True) if DATABASE_URL else None


def test_connection():
    if engine is None:
        raise RuntimeError("DATABASE_URL is not configured.")
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))
        return result.scalar_one()
