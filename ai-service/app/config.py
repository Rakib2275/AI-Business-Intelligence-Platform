
import os
from pathlib import Path

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
MODEL_ARTIFACT_BUCKET = os.getenv("MODEL_ARTIFACT_BUCKET", "").strip()
MODEL_ARTIFACT_BACKEND = os.getenv(
    "MODEL_ARTIFACT_BACKEND",
    "s3" if MODEL_ARTIFACT_BUCKET else "local",
).strip().lower()
MODEL_ARTIFACT_PREFIX = os.getenv("MODEL_ARTIFACT_PREFIX", "bi-platform/models").strip("/")
MODEL_ARTIFACT_S3_ENDPOINT_URL = os.getenv("MODEL_ARTIFACT_S3_ENDPOINT_URL") or None
MODEL_ARTIFACT_REGION = os.getenv(
    "MODEL_ARTIFACT_REGION",
    os.getenv("AWS_DEFAULT_REGION", "us-east-1"),
)
AI_SERVICE_DIR = Path(__file__).resolve().parent.parent
MODEL_ARTIFACT_LOCAL_DIR = Path(
    os.getenv(
        "MODEL_ARTIFACT_LOCAL_DIR",
        str(AI_SERVICE_DIR / "models" / "artifacts"),
    )
).expanduser()
if not MODEL_ARTIFACT_LOCAL_DIR.is_absolute():
    MODEL_ARTIFACT_LOCAL_DIR = AI_SERVICE_DIR / MODEL_ARTIFACT_LOCAL_DIR

engine = create_engine(DATABASE_URL, pool_pre_ping=True) if DATABASE_URL else None


def test_connection():
    if engine is None:
        raise RuntimeError("DATABASE_URL is not configured.")
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))
        return result.scalar_one()
