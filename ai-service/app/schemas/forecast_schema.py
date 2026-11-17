from pydantic import BaseModel, ConfigDict, Field


class ForecastRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    rows: list[dict[str, object]] = Field(min_length=3, max_length=100_000)
    date_column: str = Field(min_length=1, max_length=200)
    value_column: str = Field(min_length=1, max_length=200)
    periods: int = Field(ge=1, le=90)


class ForecastPoint(BaseModel):
    date: str
    value: float


class ForecastResponse(BaseModel):
    observations: list[ForecastPoint]
    forecast: list[ForecastPoint]
    trend_per_period: float = Field(alias="trendPerPeriod")
    method: str