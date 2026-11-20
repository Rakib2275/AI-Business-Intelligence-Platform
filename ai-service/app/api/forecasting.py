from fastapi import APIRouter, Depends, HTTPException

from app.api.text_to_sql import require_service_key
from app.ml.forecasting import predict_with_artifact
from app.ml.train_forecast import train_forecast_model
from app.schemas.forecast_schema import (
    ForecastPredictionRequest,
    ForecastResponse,
    ForecastTrainingRequest,
    ForecastTrainingResponse,
)
from app.services.forecast_artifact_store import (
    ArtifactStorageError,
    ForecastArtifactNotFound,
    load_forecast_artifact,
    save_forecast_artifact,
)

router = APIRouter(
    prefix="/api/v1/forecasting",
    dependencies=[Depends(require_service_key)],
)


@router.post("/train", response_model=ForecastTrainingResponse)
def train(request: ForecastTrainingRequest) -> ForecastTrainingResponse:
    try:
        artifact, metrics, trained_at = train_forecast_model(
            dataset_id=request.dataset_id,
            date_column=request.date_column,
            value_column=request.value_column,
            data_version=request.data_version,
            rows=request.rows,
        )
        save_forecast_artifact(artifact)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except ArtifactStorageError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    return ForecastTrainingResponse(
        datasetId=request.dataset_id,
        modelVersion=artifact["model_version"],
        frequency=artifact["frequency"],
        metrics=metrics,
        trainedAt=trained_at,
    )


@router.post("/predict", response_model=ForecastResponse)
def predict(request: ForecastPredictionRequest) -> ForecastResponse:
    try:
        artifact = load_forecast_artifact(
            dataset_id=request.dataset_id,
            date_column=request.date_column,
            value_column=request.value_column,
            data_version=request.data_version,
        )
        result = predict_with_artifact(artifact, request.periods)
    except ForecastArtifactNotFound as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    except (ArtifactStorageError, ValueError) as error:
        status_code = 503 if isinstance(error, ArtifactStorageError) else 422
        raise HTTPException(status_code=status_code, detail=str(error)) from error
    return ForecastResponse.model_validate(result)