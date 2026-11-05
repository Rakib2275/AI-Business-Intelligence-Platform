from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class DatasetColumn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=256)
    type: str = Field(min_length=1, max_length=128)


class ConversationTurn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: Literal["user", "assistant", "USER", "ASSISTANT"]
    content: str = Field(max_length=4000)


class TextToSqlRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question: str = Field(min_length=3, max_length=1000)
    table_name: str = Field(pattern="^[A-Za-z_][A-Za-z0-9_]*$")
    description: str | None = Field(default=None, max_length=2000)
    columns: list[DatasetColumn] = Field(min_length=1, max_length=500)
    conversation: list[ConversationTurn] = Field(default_factory=list, max_length=12)


class TextToSqlResponse(BaseModel):
    sql: str


class SummarizeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question: str = Field(min_length=3, max_length=1000)
    rows: list[dict[str, object]] = Field(max_length=50)


class SummaryResponse(BaseModel):
    summary: str