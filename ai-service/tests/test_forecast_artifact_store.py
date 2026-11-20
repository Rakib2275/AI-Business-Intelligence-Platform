from io import BytesIO
from uuid import uuid4

from botocore.exceptions import ClientError
import pytest

import app.services.forecast_artifact_store as artifact_store
from app.ml.train_forecast import train_forecast_model
from app.services.forecast_artifact_store import (
    ForecastArtifactNotFound,
    ModelArtifactNotFound,
    load_model_artifact,
    load_forecast_artifact,
    save_model_artifact,
    save_forecast_artifact,
)
from app.ml.anomaly_detection import train_anomaly_model


class InMemoryS3:
    def __init__(self) -> None:
        self.objects: dict[tuple[str, str], bytes] = {}

    def put_object(self, *, Bucket: str, Key: str, Body: bytes, **kwargs) -> None:
        self.objects[(Bucket, Key)] = Body

    def get_object(self, *, Bucket: str, Key: str) -> dict[str, BytesIO]:
        try:
            body = self.objects[(Bucket, Key)]
        except KeyError as error:
            raise ClientError(
                {"Error": {"Code": "NoSuchKey", "Message": "Missing object"}},
                "GetObject",
            ) from error
        return {"Body": BytesIO(body)}


def test_saved_forecast_artifact_is_scoped_and_loaded_by_version(monkeypatch) -> None:
    dataset_id = uuid4()
    version = "upload-2026-01-12"
    rows = [
        {"date": f"2026-01-{day:02d}", "value": day * 10}
        for day in range(1, 13)
    ]
    artifact, _, _ = train_forecast_model(
        dataset_id=dataset_id,
        date_column="date",
        value_column="value",
        data_version=version,
        rows=rows,
    )
    fake_s3 = InMemoryS3()
    monkeypatch.setattr(artifact_store, "MODEL_ARTIFACT_BUCKET", "private-models")
    monkeypatch.setattr(artifact_store, "_s3_client", lambda: fake_s3)

    save_forecast_artifact(artifact)
    loaded = load_forecast_artifact(
        dataset_id=dataset_id,
        date_column="date",
        value_column="value",
        data_version=version,
    )

    assert loaded["model_version"] == artifact["model_version"]
    assert loaded["dataset_id"] == str(dataset_id)
    try:
        load_forecast_artifact(
            dataset_id=dataset_id,
            date_column="date",
            value_column="value",
            data_version="new-upload",
        )
    except ForecastArtifactNotFound:
        pass
    else:
        raise AssertionError("A stale artifact must not be used for new data.")


def test_saved_anomaly_artifact_is_dataset_and_feature_scoped(monkeypatch) -> None:
    dataset_id = uuid4()
    feature_columns = ["amount"]
    artifact, _, _ = train_anomaly_model(
        dataset_id=dataset_id,
        feature_columns=feature_columns,
        data_version="revision-1",
        rows=[{"amount": 100 + index} for index in range(40)],
    )
    fake_s3 = InMemoryS3()
    monkeypatch.setattr(artifact_store, "MODEL_ARTIFACT_BUCKET", "private-models")
    monkeypatch.setattr(artifact_store, "_s3_client", lambda: fake_s3)

    save_model_artifact("anomaly", artifact, feature_columns)
    loaded = load_model_artifact(
        "anomaly",
        dataset_id=dataset_id,
        feature_columns=feature_columns,
        data_version="revision-1",
    )

    assert loaded["model_version"] == artifact["model_version"]
    with pytest.raises(ModelArtifactNotFound):
        load_model_artifact(
            "anomaly",
            dataset_id=dataset_id,
            feature_columns=feature_columns,
            data_version="revision-2",
        )
    with pytest.raises(ModelArtifactNotFound):
        load_model_artifact(
            "anomaly",
            dataset_id=dataset_id,
            feature_columns=["different"],
            data_version="revision-1",
        )
