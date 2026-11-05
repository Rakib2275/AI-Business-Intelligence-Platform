
import logging

from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy.exc import SQLAlchemyError

from app.api.text_to_sql import require_service_key
from app.api.text_to_sql import router as text_to_sql_router
from app.config import test_connection
from app.services.schema_service import get_database_schema

logger = logging.getLogger(__name__)

app = FastAPI(
    title="AI Business Intelligence Service",
    description="Private AI service for schema-aware, read-only business queries.",
    version="1.0.0",
)
app.include_router(text_to_sql_router)


@app.get("/")
def home() -> dict[str, str]:
    return {"message": "AI Service is running"}


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "healthy",
        "service": "AI Business Intelligence",
    }


@app.get("/health/database")
def database_health() -> dict[str, object]:
    try:
        result = test_connection()
        return {
            "status": "connected",
            "database_test": result,
        }
    except SQLAlchemyError as error:
        logger.exception("AI service database health check failed")
        raise HTTPException(
            status_code=503,
            detail="Database connection failed",
        ) from error


@app.get("/api/v1/database/schema", dependencies=[Depends(require_service_key)])
def database_schema() -> dict[str, object]:
    try:
        return {"tables": get_database_schema()}
    except SQLAlchemyError as error:
        logger.exception("AI service database schema inspection failed")
        raise HTTPException(
            status_code=503,
            detail="Database schema could not be inspected.",
        ) from error
