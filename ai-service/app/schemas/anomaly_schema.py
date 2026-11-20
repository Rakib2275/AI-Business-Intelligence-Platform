from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AnomalyTrainingRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    dataset_id: UUID
    rows: list[dict[str, object]] = Field(min_length=20, max_length=100_000)
    feature_columns: list[str] = Field(min_length=1, max_length=20)
    data_version: str = Field(min_length=1, max_length=200)


class AnomalyDetectionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    dataset_id: UUID
    rows: list[dict[str, object]] = Field(min_length=1, max_length=100_000)
    feature_columns: list[str] = Field(min_length=1, max_length=20)
    data_version: str = Field(min_length=1, max_length=200)


class AnomalyMetrics(BaseModel):
    training_rows: int
    flagged_training_rows: int
    feature_count: int
    contamination: float


class AnomalyTrainingResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    dataset_id: UUID = Field(alias="datasetId")
    model_version: str = Field(alias="modelVersion")
    feature_columns: list[str] = Field(alias="featureColumns")
    trained_at: str = Field(alias="trainedAt")
    metrics: AnomalyMetrics
