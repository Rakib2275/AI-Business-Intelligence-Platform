from fastapi import APIRouter, Depends, HTTPException

from app.api.text_to_sql import require_service_key
from app.ml.forecasting import forecast_sales
from app.schemas.forecast_schema import ForecastRequest, ForecastResponse

router = APIRouter(
    prefix="/api/v1/forecasting",
    dependencies=[Depends(require_service_key)],
)


@router.post("/forecast", response_model=ForecastResponse)
def forecast(request: ForecastRequest) -> ForecastResponse:
    try:
        return forecast_sales(request)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error