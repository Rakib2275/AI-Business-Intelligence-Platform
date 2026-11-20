from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field


class ReportQuery(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question: str = Field(min_length=1, max_length=1_000)
    summary: str = Field(min_length=1, max_length=2_000)
    created_at: str = Field(min_length=1, max_length=100)


class ReportGenerationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=3, max_length=120)
    queries: list[ReportQuery] = Field(min_length=1, max_length=50)


class GeneratedReport(BaseModel):
    model_config = ConfigDict(extra="forbid")

    summary: str = Field(min_length=1, max_length=4_000)
    findings: list[Annotated[str, Field(max_length=500)]] = Field(max_length=8)
    recommendations: list[Annotated[str, Field(max_length=500)]] = Field(max_length=6)
