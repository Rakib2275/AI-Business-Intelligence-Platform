from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4

import numpy as np
from sklearn.ensemble import IsolationForest

MINIMUM_TRAINING_ROWS = 20
MAX_ANOMALIES_IN_RESPONSE = 1_000
CONTAMINATION = 0.05


def _parse_numeric(value: object) -> float | None:
    if isinstance(value, bool) or value is None:
        return None
    try:
        numeric_value = (
            float(value.replace(",", "").strip())
            if isinstance(value, str)
            else float(value)
        )
    except (TypeError, ValueError, OverflowError):
        return None
    return numeric_value if np.isfinite(numeric_value) else None


def _numeric_matrix(
    rows: list[dict[str, object]],
    feature_columns: list[str],
) -> tuple[np.ndarray, list[int]]:
    if not feature_columns or len(set(feature_columns)) != len(feature_columns):
        raise ValueError("Select one or more distinct numeric columns.")

    matrix = np.full((len(rows), len(feature_columns)), np.nan, dtype=float)
    row_indices: list[int] = []
    for row_index, row in enumerate(rows):
        has_value = False
        for column_index, column in enumerate(feature_columns):
            value = _parse_numeric(row.get(column))
            if value is not None:
                matrix[row_index, column_index] = value
                has_value = True
        if has_value:
            row_indices.append(row_index)

    if not row_indices:
        raise ValueError("No rows contain numeric values for the selected columns.")
    return matrix[row_indices], row_indices


def train_anomaly_model(
    *,
    dataset_id: UUID,
    feature_columns: list[str],
    data_version: str,
    rows: list[dict[str, object]],
) -> tuple[dict[str, Any], dict[str, int | float], str]:
    matrix, _ = _numeric_matrix(rows, feature_columns)
    if len(matrix) < MINIMUM_TRAINING_ROWS:
        raise ValueError(
            f"At least {MINIMUM_TRAINING_ROWS} rows with numeric values are required."
        )

    if np.isnan(matrix).all(axis=0).any():
        raise ValueError("Each selected feature must contain at least one numeric value.")
    medians = np.nanmedian(matrix, axis=0)
    if not np.isfinite(medians).all():
        raise ValueError("Each selected feature must contain at least one numeric value.")
    imputed = np.where(np.isnan(matrix), medians, matrix)
    model = IsolationForest(
        n_estimators=200,
        contamination=CONTAMINATION,
        random_state=42,
        n_jobs=1,
    )
    labels = model.fit_predict(imputed)
    model_version = uuid4().hex
    trained_at = datetime.now(timezone.utc).isoformat()
    metrics: dict[str, int | float] = {
        "training_rows": int(len(imputed)),
        "flagged_training_rows": int(np.count_nonzero(labels == -1)),
        "feature_count": len(feature_columns),
        "contamination": CONTAMINATION,
    }
    artifact: dict[str, Any] = {
        "schema_version": 1,
        "model_type": "anomaly",
        "dataset_id": str(dataset_id),
        "feature_columns": feature_columns,
        "data_version": data_version,
        "model_version": model_version,
        "trained_at": trained_at,
        "medians": medians.tolist(),
        "model": model,
        "metrics": metrics,
    }
    return artifact, metrics, trained_at


def detect_with_artifact(
    artifact: dict[str, Any],
    rows: list[dict[str, object]],
) -> dict[str, object]:
    model = artifact.get("model")
    feature_columns = artifact.get("feature_columns")
    medians = artifact.get("medians")
    if (
        not isinstance(model, IsolationForest)
        or not isinstance(feature_columns, list)
        or not feature_columns
        or not isinstance(medians, list)
        or len(medians) != len(feature_columns)
    ):
        raise ValueError("The stored anomaly model has an unsupported format.")

    matrix, row_indices = _numeric_matrix(rows, feature_columns)
    median_values = np.asarray(medians, dtype=float)
    if not np.isfinite(median_values).all():
        raise ValueError("The stored anomaly model has invalid preprocessing data.")
    imputed = np.where(np.isnan(matrix), median_values, matrix)
    labels = model.predict(imputed)
    scores = -model.decision_function(imputed)
    anomalies = [
        {
            "rowIndex": row_index,
            "score": float(score),
            "values": {
                column: _parse_numeric(rows[row_index].get(column))
                for column in feature_columns
            },
        }
        for row_index, label, score, row in zip(
            row_indices,
            labels,
            scores,
            imputed,
            strict=True,
        )
        if label == -1
    ]
    anomalies.sort(key=lambda result: result["score"], reverse=True)

    return {
        "totalRows": len(rows),
        "scoredRows": len(row_indices),
        "anomalyCount": len(anomalies),
        "truncated": len(anomalies) > MAX_ANOMALIES_IN_RESPONSE,
        "anomalies": anomalies[:MAX_ANOMALIES_IN_RESPONSE],
        "modelVersion": artifact["model_version"],
        "trainedAt": artifact["trained_at"],
    }