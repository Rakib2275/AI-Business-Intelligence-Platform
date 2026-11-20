from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ForecastTrainingRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    dataset_id: UUID
    rows: list[dict[str, object]] = Field(min_length=3, max_length=100_000)
    date_column: str = Field(min_length=1, max_length=200)
    value_column: str = Field(min_length=1, max_length=200)
    data_version: str = Field(min_length=1, max_length=200)


class ForecastPredictionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    dataset_id: UUID
    date_column: str = Field(min_length=1, max_length=200)
    value_column: str = Field(min_length=1, max_length=200)
    data_version: str = Field(min_length=1, max_length=200)
    periods: int = Field(ge=1, le=90)


class ForecastPoint(BaseModel):
    date: str
    value: float


class ForecastMetrics(BaseModel):
    mae: float
    rmse: float
    training_periods: int
    validation_periods: int


class ForecastTrainingResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    dataset_id: UUID = Field(alias="datasetId")
    model_version: str = Field(alias="modelVersion")
    frequency: str
    metrics: ForecastMetrics
    trained_at: str = Field(alias="trainedAt")


class ForecastResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    observations: list[ForecastPoint]
    forecast: list[ForecastPoint]
    trend_per_period: float = Field(alias="trendPerPeriod")
    method: str
    model_version: str = Field(alias="modelVersion")
    metrics: ForecastMetrics
    trained_at: str = Field(alias="trainedAt")