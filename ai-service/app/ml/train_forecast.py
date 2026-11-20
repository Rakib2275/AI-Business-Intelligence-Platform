from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4

import numpy as np
import pandas as pd

from app.ml.forecasting import (
    MODEL_METHOD,
    _feature_matrix,
    _fit_model,
    prepare_series,
)
from app.schemas.forecast_schema import ForecastMetrics


def train_forecast_model(
    *,
    dataset_id: UUID,
    date_column: str,
    value_column: str,
    data_version: str,
    rows: list[dict[str, object]],
) -> tuple[dict[str, Any], ForecastMetrics, str]:
    series, frequency, seasonal_period = prepare_series(
        rows,
        date_column,
        value_column,
    )
    values = series.to_numpy(dtype=float)
    validation_periods = max(1, int(np.ceil(len(values) * 0.2)))
    training_periods = len(values) - validation_periods
    if training_periods < 3:
        raise ValueError("At least three chronological training periods are required.")

    validation_model, validation_seasonality = _fit_model(
        values[:training_periods],
        seasonal_period,
    )
    validation_indices = np.arange(training_periods, len(values), dtype=float)
    validation_predictions = validation_model.predict(
        _feature_matrix(
            validation_indices,
            seasonal_period,
            validation_seasonality,
        )
    )
    errors = values[training_periods:] - validation_predictions
    metrics = ForecastMetrics(
        mae=float(np.mean(np.abs(errors))),
        rmse=float(np.sqrt(np.mean(np.square(errors)))),
        training_periods=training_periods,
        validation_periods=validation_periods,
    )

    model, include_seasonality = _fit_model(values, seasonal_period)
    model_version = uuid4().hex
    trained_at = datetime.now(timezone.utc).isoformat()
    artifact: dict[str, Any] = {
        "schema_version": 1,
        "dataset_id": str(dataset_id),
        "date_column": date_column,
        "value_column": value_column,
        "data_version": data_version,
        "model_version": model_version,
        "trained_at": trained_at,
        "frequency": frequency,
        "seasonal_period": seasonal_period,
        "include_seasonality": include_seasonality,
        "model": model,
        "metrics": metrics.model_dump(),
        "dates": [pd.Timestamp(date).isoformat() for date in series.index],
        "values": values.tolist(),
        "method": MODEL_METHOD,
    }
    return artifact, metrics, trained_at