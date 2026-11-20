from fastapi import APIRouter, Depends, HTTPException

from app.api.text_to_sql import require_service_key
from app.ml.anomaly_detection import detect_with_artifact, train_anomaly_model
from app.schemas.anomaly_schema import (
    AnomalyDetectionRequest,
    AnomalyTrainingRequest,
    AnomalyTrainingResponse,
)
from app.services.forecast_artifact_store import (
    ArtifactStorageError,
    ModelArtifactNotFound,
    load_model_artifact,
    save_model_artifact,
)

router = APIRouter(
    prefix="/api/v1/anomalies",
    dependencies=[Depends(require_service_key)],
)


@router.post("/train", response_model=AnomalyTrainingResponse)
def train(request: AnomalyTrainingRequest) -> AnomalyTrainingResponse:
    try:
        artifact, metrics, trained_at = train_anomaly_model(
            dataset_id=request.dataset_id,
            feature_columns=request.feature_columns,
            data_version=request.data_version,
            rows=request.rows,
        )
        save_model_artifact("anomaly", artifact, request.feature_columns)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except ArtifactStorageError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    return AnomalyTrainingResponse(
        datasetId=request.dataset_id,
        modelVersion=artifact["model_version"],
        featureColumns=request.feature_columns,
        trainedAt=trained_at,
        metrics=metrics,
    )


@router.post("/detect")
def detect(request: AnomalyDetectionRequest) -> dict[str, object]:
    try:
        artifact = load_model_artifact(
            "anomaly",
            dataset_id=request.dataset_id,
            feature_columns=request.feature_columns,
            data_version=request.data_version,
        )
        return detect_with_artifact(artifact, request.rows)
    except ModelArtifactNotFound as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    except (ArtifactStorageError, ValueError) as error:
        status_code = 503 if isinstance(error, ArtifactStorageError) else 422
        raise HTTPException(status_code=status_code, detail=str(error)) from error