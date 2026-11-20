from uuid import uuid4

import pytest

from app.ml.anomaly_detection import detect_with_artifact, train_anomaly_model


def _training_rows() -> list[dict[str, float]]:
    return [{"amount": float(100 + index)} for index in range(40)]


def test_anomaly_model_flags_extreme_value_and_preserves_input_row_index() -> None:
    artifact, metrics, _ = train_anomaly_model(
        dataset_id=uuid4(),
        feature_columns=["amount"],
        data_version="revision-1",
        rows=_training_rows(),
    )

    result = detect_with_artifact(
        artifact,
        [{"amount": 125.0}, {"amount": 50_000.0}],
    )

    assert metrics["training_rows"] == 40
    assert result["anomalyCount"] == 1
    assert result["anomalies"][0]["rowIndex"] == 1
    assert result["anomalies"][0]["values"] == {"amount": 50_000.0}


def test_anomaly_output_preserves_missing_raw_values_after_imputation() -> None:
    artifact, _, _ = train_anomaly_model(
        dataset_id=uuid4(),
        feature_columns=["amount", "units"],
        data_version="revision-1",
        rows=[
            {"amount": float(100 + index), "units": float(10 + index)}
            for index in range(40)
        ],
    )

    result = detect_with_artifact(
        artifact,
        [{"amount": 50_000.0, "units": None}],
    )

    assert result["anomalyCount"] == 1
    assert result["anomalies"][0]["values"] == {"amount": 50_000.0, "units": None}


def test_anomaly_training_rejects_insufficient_numeric_rows() -> None:
    with pytest.raises(ValueError, match="At least 20"):
        train_anomaly_model(
            dataset_id=uuid4(),
            feature_columns=["amount"],
            data_version="revision-1",
            rows=[{"amount": 1.0}] * 19,
        )


def test_anomaly_training_rejects_feature_without_numeric_values() -> None:
    with pytest.raises(ValueError, match="Each selected feature"):
        train_anomaly_model(
            dataset_id=uuid4(),
            feature_columns=["amount", "empty"],
            data_version="revision-1",
            rows=[{"amount": float(index), "empty": None} for index in range(20)],
        )
