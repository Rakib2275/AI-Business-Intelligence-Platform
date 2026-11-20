from fastapi import APIRouter, Depends

from app.api.text_to_sql import require_service_key
from app.schemas.report_schema import GeneratedReport, ReportGenerationRequest
from app.services.report_service import generate_business_report

router = APIRouter(
    prefix="/api/v1/reports",
    dependencies=[Depends(require_service_key)],
)


@router.post("/generate", response_model=GeneratedReport)
async def generate_report(request: ReportGenerationRequest) -> GeneratedReport:
    return await generate_business_report(request)
