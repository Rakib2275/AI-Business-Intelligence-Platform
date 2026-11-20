from typing import Any

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression

MINIMUM_PERIODS = 5
MAX_OBSERVATIONS_IN_RESPONSE = 1_000
MODEL_METHOD = "linear regression with optional Fourier seasonality"


def _feature_matrix(
    indices: np.ndarray,
    seasonal_period: int,
    include_seasonality: bool,
) -> np.ndarray:
    features = [indices]
    if include_seasonality:
        for harmonic in range(1, min(4, seasonal_period // 2 + 1)):
            angle = 2 * np.pi * harmonic * indices / seasonal_period
            features.extend((np.sin(angle), np.cos(angle)))
    return np.column_stack(features)


def _date_frequency(index: pd.DatetimeIndex) -> tuple[str, int]:
    gaps = index.to_series().diff().dropna().dt.total_seconds().to_numpy() / 86_400
    positive_gaps = gaps[gaps > 0]
    median_gap = float(np.median(positive_gaps)) if len(positive_gaps) else 1.0
    if median_gap >= 25:
        return "MS", 12
    if median_gap >= 5:
        return "W-SUN", 52
    return "D", 7


def prepare_series(
    rows: list[dict[str, object]],
    date_column: str,
    value_column: str,
) -> tuple[pd.Series, str, int]:
    frame = pd.DataFrame(rows)
    if date_column not in frame or value_column not in frame:
        raise ValueError("The selected date or value column is not present in the dataset.")

    dates = pd.to_datetime(frame[date_column], errors="coerce", utc=True)
    values = pd.to_numeric(
        frame[value_column].astype("string").str.replace(",", "", regex=False),
        errors="coerce",
    )
    valid = dates.notna() & values.notna()
    valid &= np.isfinite(values.fillna(0).to_numpy(dtype=float))
    if int(valid.sum()) < MINIMUM_PERIODS:
        raise ValueError(
            f"At least {MINIMUM_PERIODS} valid date/value rows are required for training."
        )

    observations = pd.DataFrame(
        {
            "date": dates[valid].dt.tz_convert(None).dt.normalize(),
            "value": values[valid].astype(float),
        }
    )
    daily = observations.groupby("date", as_index=True)["value"].sum().sort_index()
    frequency, seasonal_period = _date_frequency(pd.DatetimeIndex(daily.index))
    series = daily.resample(frequency).sum().fillna(0.0)
    if len(series) < MINIMUM_PERIODS:
        raise ValueError(
            f"At least {MINIMUM_PERIODS} historical time periods are required for training."
        )
    return series, frequency, seasonal_period


def _fit_model(
    values: np.ndarray,
    seasonal_period: int,
) -> tuple[LinearRegression, bool]:
    indices = np.arange(len(values), dtype=float)
    include_seasonality = len(values) >= seasonal_period * 2
    model = LinearRegression()
    model.fit(
        _feature_matrix(indices, seasonal_period, include_seasonality),
        values,
    )
    return model, include_seasonality


def predict_with_artifact(
    artifact: dict[str, Any],
    periods: int,
) -> dict[str, object]:
    model = artifact.get("model")
    if not isinstance(model, LinearRegression):
        raise ValueError("The stored forecast model has an unsupported format.")

    frequency = artifact.get("frequency")
    seasonal_period = artifact.get("seasonal_period")
    values = artifact.get("values")
    dates = artifact.get("dates")
    if (
        not isinstance(frequency, str)
        or not isinstance(seasonal_period, int)
        or not isinstance(values, list)
        or not isinstance(dates, list)
        or len(values) != len(dates)
        or len(values) < MINIMUM_PERIODS
    ):
        raise ValueError("The stored forecast model is incomplete.")

    history = pd.DatetimeIndex(pd.to_datetime(dates, utc=True)).tz_convert(None)
    future_indices = np.arange(len(values), len(values) + periods, dtype=float)
    predictions = model.predict(
        _feature_matrix(
            future_indices,
            seasonal_period,
            bool(artifact.get("include_seasonality")),
        )
    )
    future_dates = pd.date_range(
        start=history[-1],
        periods=periods + 1,
        freq=frequency,
    )[1:]
    observation_start = max(0, len(values) - MAX_OBSERVATIONS_IN_RESPONSE)

    return {
        "observations": [
            {"date": date.isoformat() + "Z", "value": float(value)}
            for date, value in zip(
                history[observation_start:],
                values[observation_start:],
                strict=True,
            )
        ],
        "forecast": [
            {"date": date.isoformat() + "Z", "value": max(0.0, float(value))}
            for date, value in zip(future_dates, predictions, strict=True)
        ],
        "trend_per_period": float(model.coef_[0]),
        "method": artifact["method"],
        "model_version": artifact["model_version"],
        "metrics": artifact["metrics"],
        "trained_at": artifact["trained_at"],
    }
