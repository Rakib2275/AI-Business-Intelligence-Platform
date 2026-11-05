import secrets

from fastapi import APIRouter, Depends, Header, HTTPException

from app.config import AI_SERVICE_API_KEY
from app.schemas.query_schema import (
    SummarizeRequest,
    SummaryResponse,
    TextToSqlRequest,
    TextToSqlResponse,
)
from app.services.llm_service import generate_sql, summarize_results


async def require_service_key(x_api_key: str | None = Header(default=None)) -> None:
    if not AI_SERVICE_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="AI service authentication is not configured.",
        )
    if not x_api_key or not secrets.compare_digest(x_api_key, AI_SERVICE_API_KEY):
        raise HTTPException(status_code=401, detail="Invalid AI service credentials.")


router = APIRouter(
    prefix="/api/v1",
    dependencies=[Depends(require_service_key)],
)


@router.post("/text-to-sql/generate", response_model=TextToSqlResponse)
async def text_to_sql(request: TextToSqlRequest) -> TextToSqlResponse:
    return TextToSqlResponse(sql=await generate_sql(request))


@router.post("/text-to-sql/summarize", response_model=SummaryResponse)
async def summarize(request: SummarizeRequest) -> SummaryResponse:
    return SummaryResponse(
        summary=await summarize_results(request.question, request.rows),
    )