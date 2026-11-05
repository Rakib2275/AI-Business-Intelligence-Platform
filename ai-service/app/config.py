
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv(override=False)

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL missing in .env")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
AI_SERVICE_API_KEY = os.getenv("AI_SERVICE_API_KEY", "")

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
)


def test_connection():
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))
        return result.scalar_one()
