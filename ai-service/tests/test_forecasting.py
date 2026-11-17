from datetime import date, timedelta

import pytest

from app.ml.forecasting import forecast_sales
from app.schemas.forecast_schema import ForecastRequest


def test_forecast_aggregates_same_day_sales_and_predicts_future_values() -> None:
    result = forecast_sales(
        ForecastRequest(
            rows=[
                {"day": "2026-01-03", "sales": 35},
                {"day": "2026-01-01", "sales": 10},
                {"day": "2026-01-01", "sales": 5},
                {"day": "2026-01-02", "sales": 25},
            ],
            date_column="day",
            value_column="sales",
            periods=2,
        )
    )

    assert [point.value for point in result.observations] == [15, 25, 35]
    assert result.forecast[0].date == "2026-01-04T00:00:00Z"
    assert result.forecast[0].value == pytest.approx(45)
    assert len(result.forecast) == 2
    assert result.method == "linear regression"


def test_forecast_uses_monthly_periods_for_monthly_data() -> None:
    result = forecast_sales(
        ForecastRequest(
            rows=[
                {"month": "2026-01-01", "sales": 100},
                {"month": "2026-02-01", "sales": 120},
                {"month": "2026-03-01", "sales": 140},
            ],
            date_column="month",
            value_column="sales",
            periods=1,
        )
    )

    assert result.forecast[0].date == "2026-04-01T00:00:00Z"


def test_forecast_uses_seasonal_features_when_history_covers_two_cycles() -> None:
    start = date(2026, 1, 1)
    rows = [
        {
            "day": (start + timedelta(days=index)).isoformat(),
            "sales": 100 + index * 3 + (index % 7) * 10,
        }
        for index in range(28)
    ]

    result = forecast_sales(
        ForecastRequest(
            rows=rows,
            date_column="day",
            value_column="sales",
            periods=7,
        )
    )

    assert len(result.forecast) == 7
    assert result.forecast[0].date == "2026-01-29T00:00:00Z"
    assert all(point.value >= 0 for point in result.forecast)


def test_forecast_requires_valid_history_and_columns() -> None:
    with pytest.raises(ValueError, match="three valid date/value rows"):
        forecast_sales(
            ForecastRequest(
                rows=[
                    {"day": "2026-01-01", "sales": 10},
                    {"day": "invalid", "sales": 20},
                    {"day": "2026-01-03", "sales": 30},
                ],
                date_column="day",
                value_column="sales",
                periods=1,
            )
        )

    with pytest.raises(ValueError, match="selected date or value column"):
        forecast_sales(
            ForecastRequest(
                rows=[
                    {"day": "2026-01-01", "sales": 10},
                    {"day": "2026-01-02", "sales": 20},
                    {"day": "2026-01-03", "sales": 30},
                ],
                date_column="missing",
                value_column="sales",
                periods=1,
            )
        )
