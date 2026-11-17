import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression

from app.schemas.forecast_schema import ForecastPoint, ForecastRequest, ForecastResponse


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


def _serialize_date(value: pd.Timestamp) -> str:
    return value.tz_localize("UTC").isoformat().replace("+00:00", "Z")


def forecast_sales(request: ForecastRequest) -> ForecastResponse:
    frame = pd.DataFrame(request.rows)
    if request.date_column not in frame or request.value_column not in frame:
        raise ValueError("The selected date or value column is not present in the dataset.")

    date_values = pd.to_datetime(frame[request.date_column], errors="coerce", utc=True)
    raw_values = frame[request.value_column]
    numeric_values = pd.to_numeric(
        raw_values.astype("string").str.replace(",", "", regex=False),
        errors="coerce",
    )
    valid = date_values.notna() & numeric_values.notna()
    valid &= np.isfinite(numeric_values.fillna(0).to_numpy(dtype=float))
    if int(valid.sum()) < 3:
        raise ValueError("At least three valid date/value rows are required for forecasting.")

    daily = pd.DataFrame(
        {
            "date": date_values[valid].dt.tz_convert(None).dt.normalize(),
            "value": numeric_values[valid].astype(float),
        }
    )
    daily = daily.groupby("date", as_index=True)["value"].sum().sort_index()
    frequency, seasonal_period = _date_frequency(pd.DatetimeIndex(daily.index))
    series = daily.resample(frequency).sum().fillna(0.0)
    if len(series) < 3:
        raise ValueError("At least three historical time periods are required for forecasting.")

    indices = np.arange(len(series), dtype=float)
    include_seasonality = len(series) >= seasonal_period * 2
    model = LinearRegression()
    model.fit(
        _feature_matrix(indices, seasonal_period, include_seasonality),
        series.to_numpy(dtype=float),
    )

    future_indices = np.arange(len(series), len(series) + request.periods, dtype=float)
    predictions = model.predict(
        _feature_matrix(future_indices, seasonal_period, include_seasonality)
    )
    future_dates = pd.date_range(
        start=series.index[-1],
        periods=request.periods + 1,
        freq=frequency,
    )[1:]

    observations = [
        ForecastPoint(date=_serialize_date(date), value=float(value))
        for date, value in series.items()
    ]
    forecast = [
        ForecastPoint(date=_serialize_date(date), value=max(0.0, float(value)))
        for date, value in zip(future_dates, predictions, strict=True)
    ]
    return ForecastResponse(
        observations=observations,
        forecast=forecast,
        trendPerPeriod=float(model.coef_[0]),
        method="linear regression",
    )