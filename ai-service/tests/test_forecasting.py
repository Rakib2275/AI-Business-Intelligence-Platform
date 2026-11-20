from datetime import date, timedelta
from uuid import uuid4

import pytest

from app.ml.forecasting import predict_with_artifact
from app.ml.train_forecast import train_forecast_model


def _train(rows: list[dict[str, object]], date_column: str, value_column: str):
    return train_forecast_model(
        dataset_id=uuid4(),
        date_column=date_column,
        value_column=value_column,
        data_version="test-upload",
        rows=rows,
    )


def test_training_aggregates_same_day_rows_and_predicts_from_saved_model() -> None:
    rows = [
        {"day": "2026-01-03", "sales": 35},
        {"day": "2026-01-01", "sales": 10},
        {"day": "2026-01-01", "sales": 5},
        {"day": "2026-01-02", "sales": 25},
        {"day": "2026-01-04", "sales": 45},
        {"day": "2026-01-05", "sales": 55},
        {"day": "2026-01-06", "sales": 65},
    ]
    artifact, metrics, _ = _train(rows, "day", "sales")
    result = predict_with_artifact(artifact, periods=2)

    assert [point["value"] for point in result["observations"][:3]] == [15, 25, 35]
    assert result["forecast"][0]["date"] == "2026-01-07T00:00:00Z"
    assert result["forecast"][0]["value"] == pytest.approx(75)
    assert len(result["forecast"]) == 2
    assert result["method"].startswith("linear regression")
    assert metrics.training_periods == 4
    assert metrics.validation_periods == 2


def test_forecast_uses_monthly_periods_for_monthly_data() -> None:
    rows = [
        {"month": f"2025-{month:02d}-01", "sales": month * 100}
        for month in range(1, 13)
    ]
    artifact, _, _ = _train(rows, "month", "sales")
    result = predict_with_artifact(artifact, periods=1)

    assert result["forecast"][0]["date"] == "2026-01-01T00:00:00Z"


def test_forecast_uses_seasonal_features_when_history_covers_two_cycles() -> None:
    start = date(2026, 1, 1)
    rows = [
        {
            "day": (start + timedelta(days=index)).isoformat(),
            "sales": 100 + index * 3 + (index % 7) * 10,
        }
        for index in range(35)
    ]
    artifact, _, _ = _train(rows, "day", "sales")
    result = predict_with_artifact(artifact, periods=7)

    assert len(result["forecast"]) == 7
    assert result["forecast"][0]["date"] == "2026-02-05T00:00:00Z"
    assert all(point["value"] >= 0 for point in result["forecast"])


def test_forecast_requires_valid_history_and_columns() -> None:
    with pytest.raises(ValueError, match="At least 5 valid date/value rows"):
        _train(
            [
                {"day": "2026-01-01", "sales": 10},
                {"day": "invalid", "sales": 20},
                {"day": "2026-01-03", "sales": 30},
                {"day": "2026-01-04", "sales": 40},
                {"day": "invalid", "sales": 50},
            ],
            "day",
            "sales",
        )

    with pytest.raises(ValueError, match="selected date or value column"):
        _train(
            [
                {"day": f"2026-01-{day:02d}", "sales": day * 10}
                for day in range(1, 7)
            ],
            "missing",
            "sales",
        )
