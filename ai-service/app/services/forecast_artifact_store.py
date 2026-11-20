import hashlib
import json
from io import BytesIO
from typing import Any
from uuid import UUID

import boto3
import joblib
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError

from app.config import (
    MODEL_ARTIFACT_BUCKET,
    MODEL_ARTIFACT_PREFIX,
    MODEL_ARTIFACT_REGION,
    MODEL_ARTIFACT_S3_ENDPOINT_URL,
)


class ArtifactStorageError(RuntimeError):
    pass


class ForecastArtifactNotFound(RuntimeError):
    pass


ModelArtifactNotFound = ForecastArtifactNotFound


def _s3_client():
    return boto3.client(
        "s3",
        endpoint_url=MODEL_ARTIFACT_S3_ENDPOINT_URL,
        region_name=MODEL_ARTIFACT_REGION,
        config=Config(
            connect_timeout=5,
            read_timeout=30,
            retries={"max_attempts": 3, "mode": "standard"},
        ),
    )


def _require_bucket() -> str:
    if not MODEL_ARTIFACT_BUCKET:
        raise ArtifactStorageError("MODEL_ARTIFACT_BUCKET is not configured.")
    return MODEL_ARTIFACT_BUCKET


def _model_keys(
    model_type: str,
    dataset_id: UUID,
    feature_columns: list[str],
) -> tuple[str, str]:
    if model_type not in {"forecasting", "anomaly"}:
        raise ValueError("Unsupported model artifact type.")
    features = json.dumps(feature_columns, ensure_ascii=False, separators=(",", ":"))
    target = hashlib.sha256(features.encode("utf-8")).hexdigest()[:24]
    prefix = MODEL_ARTIFACT_PREFIX.strip("/")
    root = f"{prefix}/" if prefix else ""
    base = f"{root}{model_type}/{dataset_id}/{target}"
    return f"{base}/latest.json", f"{base}/versions"


def save_model_artifact(
    model_type: str,
    artifact: dict[str, Any],
    feature_columns: list[str],
) -> None:
    bucket = _require_bucket()
    dataset_id = UUID(artifact["dataset_id"])
    pointer_key, versions_prefix = _model_keys(
        model_type,
        dataset_id,
        feature_columns,
    )
    artifact_key = f"{versions_prefix}/{artifact['model_version']}.joblib"
    buffer = BytesIO()
    joblib.dump(artifact, buffer, compress=3)
    pointer = {
        "schema_version": 1,
        "model_type": model_type,
        "dataset_id": str(dataset_id),
        "feature_columns": feature_columns,
        "data_version": artifact["data_version"],
        "model_version": artifact["model_version"],
        "artifact_key": artifact_key,
    }
    try:
        client = _s3_client()
        client.put_object(
            Bucket=bucket,
            Key=artifact_key,
            Body=buffer.getvalue(),
            ContentType="application/octet-stream",
        )
        client.put_object(
            Bucket=bucket,
            Key=pointer_key,
            Body=json.dumps(pointer, separators=(",", ":")).encode("utf-8"),
            ContentType="application/json",
            CacheControl="no-store",
        )
    except (BotoCoreError, ClientError) as error:
        raise ArtifactStorageError(f"Could not save the {model_type} model artifact.") from error


def load_model_artifact(
    model_type: str,
    *,
    dataset_id: UUID,
    feature_columns: list[str],
    data_version: str,
) -> dict[str, Any]:
    bucket = _require_bucket()
    pointer_key, versions_prefix = _model_keys(model_type, dataset_id, feature_columns)
    try:
        client = _s3_client()
        pointer_response = client.get_object(Bucket=bucket, Key=pointer_key)
        pointer = json.loads(pointer_response["Body"].read().decode("utf-8"))
    except ClientError as error:
        code = error.response.get("Error", {}).get("Code")
        if code in {"NoSuchKey", "NotFound", "404"}:
            raise ModelArtifactNotFound(
                f"No trained {model_type} model exists for this dataset and selected columns."
            ) from error
        raise ArtifactStorageError(f"Could not load {model_type} model metadata.") from error
    except (BotoCoreError, KeyError, json.JSONDecodeError, UnicodeDecodeError) as error:
        raise ArtifactStorageError(f"{model_type.capitalize()} model metadata is invalid.") from error

    if not isinstance(pointer, dict):
        raise ArtifactStorageError(f"{model_type.capitalize()} model metadata is invalid.")
    expected_prefix = f"{versions_prefix}/"
    artifact_key = pointer.get("artifact_key")
    if (
        pointer.get("schema_version") != 1
        or pointer.get("model_type") != model_type
        or pointer.get("dataset_id") != str(dataset_id)
        or pointer.get("feature_columns") != feature_columns
        or not isinstance(artifact_key, str)
        or not artifact_key.startswith(expected_prefix)
        or "/" in artifact_key[len(expected_prefix):]
    ):
        raise ArtifactStorageError(f"{model_type.capitalize()} model metadata does not match the request.")
    if pointer.get("data_version") != data_version:
        raise ModelArtifactNotFound(
            "The dataset changed after training. Retrain the model before predicting."
        )

    try:
        artifact_response = client.get_object(Bucket=bucket, Key=artifact_key)
        artifact = joblib.load(BytesIO(artifact_response["Body"].read()))
    except (BotoCoreError, ClientError, EOFError, ValueError, ImportError) as error:
        raise ArtifactStorageError(f"Could not load the {model_type} model artifact.") from error
    if (
        not isinstance(artifact, dict)
        or artifact.get("schema_version") != 1
        or artifact.get("model_type") != model_type
        or artifact.get("dataset_id") != str(dataset_id)
        or artifact.get("feature_columns") != feature_columns
        or artifact.get("data_version") != data_version
        or artifact.get("model_version") != pointer.get("model_version")
    ):
        raise ArtifactStorageError(f"{model_type.capitalize()} model artifact failed integrity checks.")
    return artifact


def save_forecast_artifact(artifact: dict[str, Any]) -> None:
    artifact["model_type"] = "forecasting"
    artifact["feature_columns"] = [artifact["date_column"], artifact["value_column"]]
    save_model_artifact("forecasting", artifact, artifact["feature_columns"])


def load_forecast_artifact(
    *,
    dataset_id: UUID,
    date_column: str,
    value_column: str,
    data_version: str,
) -> dict[str, Any]:
    artifact = load_model_artifact(
        "forecasting",
        dataset_id=dataset_id,
        feature_columns=[date_column, value_column],
        data_version=data_version,
    )
    if (
        artifact.get("date_column") != date_column
        or artifact.get("value_column") != value_column
    ):
        raise ArtifactStorageError("Forecast model artifact failed integrity checks.")
    return artifact
