import pytest
from fastapi.testclient import TestClient

import app.api.forecasting as forecasting_api
import app.api.anomaly as anomaly_api
import app.api.text_to_sql as text_to_sql_api
import app.services.llm_service as llm_service
import app.services.report_service as report_service
from app.services.forecast_artifact_store import ForecastArtifactNotFound
from app.main import app


def test_text_to_sql_requires_service_key(monkeypatch) -> None:
    monkeypatch.setattr(text_to_sql_api, "AI_SERVICE_API_KEY", "test-secret")
    response = TestClient(app).post(
        "/api/v1/text-to-sql/generate",
        json={
            "question": "Which area had the highest sales?",
            "table_name": "sales",
            "columns": [{"name": "area", "type": "TEXT"}],
            "conversation": [{"role": "ASSISTANT", "content": "Compare regions."}],
        },
    )
    assert response.status_code == 401


def test_forecast_requires_service_key(monkeypatch) -> None:
    monkeypatch.setattr(text_to_sql_api, "AI_SERVICE_API_KEY", "test-secret")
    response = TestClient(app).post(
        "/api/v1/forecasting/train",
        json={
            "dataset_id": "e7d2f582-861b-4bbd-9258-46a34d1ae301",
            "rows": [
                {"date": "2026-01-01", "sales": 10},
                {"date": "2026-01-02", "sales": 20},
                {"date": "2026-01-03", "sales": 30},
                {"date": "2026-01-04", "sales": 40},
                {"date": "2026-01-05", "sales": 50},
            ],
            "date_column": "date",
            "value_column": "sales",
            "data_version": "2026-01-05T00:00:00Z",
        },
    )
    assert response.status_code == 401


def test_anomaly_training_requires_service_key(monkeypatch) -> None:
    monkeypatch.setattr(text_to_sql_api, "AI_SERVICE_API_KEY", "test-secret")
    response = TestClient(app).post(
        "/api/v1/anomalies/train",
        json={
            "dataset_id": "e7d2f582-861b-4bbd-9258-46a34d1ae301",
            "rows": [{"amount": index} for index in range(20)],
            "feature_columns": ["amount"],
            "data_version": "revision-1",
        },
    )
    assert response.status_code == 401


def test_anomaly_training_and_detection_use_saved_model(monkeypatch) -> None:
    monkeypatch.setattr(text_to_sql_api, "AI_SERVICE_API_KEY", "test-secret")
    artifacts = {}

    def save_artifact(model_type, artifact, feature_columns):
        artifacts[(model_type, artifact["dataset_id"], tuple(feature_columns))] = artifact

    def load_artifact(model_type, *, dataset_id, feature_columns, data_version):
        artifact = artifacts[(model_type, str(dataset_id), tuple(feature_columns))]
        if artifact["data_version"] != data_version:
            raise ModelArtifactNotFound("The dataset changed after training.")
        return artifact

    from app.services.forecast_artifact_store import ModelArtifactNotFound

    monkeypatch.setattr(anomaly_api, "save_model_artifact", save_artifact)
    monkeypatch.setattr(anomaly_api, "load_model_artifact", load_artifact)
    client = TestClient(app)
    headers = {"x-api-key": "test-secret"}
    dataset_id = "e7d2f582-861b-4bbd-9258-46a34d1ae301"
    train_response = client.post(
        "/api/v1/anomalies/train",
        headers=headers,
        json={
            "dataset_id": dataset_id,
            "rows": [{"amount": 100 + index} for index in range(40)],
            "feature_columns": ["amount"],
            "data_version": "revision-1",
        },
    )
    assert train_response.status_code == 200
    training = train_response.json()
    assert training["metrics"]["training_rows"] == 40

    detect_response = client.post(
        "/api/v1/anomalies/detect",
        headers=headers,
        json={
            "dataset_id": dataset_id,
            "rows": [{"amount": 125}, {"amount": 50_000}],
            "feature_columns": ["amount"],
            "data_version": "revision-1",
        },
    )
    assert detect_response.status_code == 200
    detected = detect_response.json()
    assert detected["modelVersion"] == training["modelVersion"]
    assert detected["anomalyCount"] == 1
    assert detected["anomalies"][0]["rowIndex"] == 1


def test_forecast_training_and_prediction_use_persisted_model(monkeypatch) -> None:
    monkeypatch.setattr(text_to_sql_api, "AI_SERVICE_API_KEY", "test-secret")
    artifacts = {}

    def save_artifact(artifact):
        artifacts[artifact["model_version"]] = artifact

    def load_artifact(*, dataset_id, date_column, value_column, data_version):
        for artifact in artifacts.values():
            if (
                artifact["dataset_id"] == str(dataset_id)
                and artifact["date_column"] == date_column
                and artifact["value_column"] == value_column
                and artifact["data_version"] == data_version
            ):
                return artifact
        raise ForecastArtifactNotFound("Train the model first.")

    monkeypatch.setattr(forecasting_api, "save_forecast_artifact", save_artifact)
    monkeypatch.setattr(forecasting_api, "load_forecast_artifact", load_artifact)
    client = TestClient(app)
    dataset_id = "e7d2f582-861b-4bbd-9258-46a34d1ae301"
    headers = {"x-api-key": "test-secret"}
    train_response = client.post(
        "/api/v1/forecasting/train",
        headers=headers,
        json={
            "dataset_id": dataset_id,
            "rows": [
                {"date": f"2026-01-{day:02d}", "sales": day * 10}
                for day in range(1, 13)
            ],
            "date_column": "date",
            "value_column": "sales",
            "data_version": "2026-01-12T00:00:00Z",
        },
    )
    assert train_response.status_code == 200
    training = train_response.json()
    assert training["datasetId"] == dataset_id
    assert training["metrics"]["validation_periods"] == 3

    response = client.post(
        "/api/v1/forecasting/predict",
        headers=headers,
        json={
            "dataset_id": dataset_id,
            "date_column": "date",
            "value_column": "sales",
            "data_version": "2026-01-12T00:00:00Z",
            "periods": 2,
        },
    )
    assert response.status_code == 200
    assert response.json()["modelVersion"] == training["modelVersion"]
    assert len(response.json()["forecast"]) == 2
    assert response.json()["forecast"][0]["value"] == pytest.approx(130)


def test_forecast_prediction_rejects_untrained_or_stale_dataset(monkeypatch) -> None:
    monkeypatch.setattr(text_to_sql_api, "AI_SERVICE_API_KEY", "test-secret")

    def missing_artifact(**kwargs):
        raise ForecastArtifactNotFound("The dataset changed after training.")

    monkeypatch.setattr(forecasting_api, "load_forecast_artifact", missing_artifact)
    response = TestClient(app).post(
        "/api/v1/forecasting/predict",
        headers={"x-api-key": "test-secret"},
        json={
            "dataset_id": "e7d2f582-861b-4bbd-9258-46a34d1ae301",
            "date_column": "date",
            "value_column": "sales",
            "data_version": "changed",
            "periods": 2,
        },
    )
    assert response.status_code == 409


def test_text_to_sql_returns_validated_sql(monkeypatch) -> None:
    monkeypatch.setattr(text_to_sql_api, "AI_SERVICE_API_KEY", "test-secret")

    async def fake_complete(system_prompt: str, user_prompt: str) -> str:
        return "SELECT area FROM sales"

    monkeypatch.setattr(llm_service, "_complete", fake_complete)
    response = TestClient(app).post(
        "/api/v1/text-to-sql/generate",
        headers={"x-api-key": "test-secret"},
        json={
            "question": "Which area had the highest sales?",
            "table_name": "sales",
            "columns": [{"name": "area", "type": "TEXT"}],
            "conversation": [{"role": "ASSISTANT", "content": "Compare regions."}],
        },
    )
    assert response.status_code == 200
    assert response.json() == {"sql": "SELECT area FROM sales"}


def test_text_to_sql_uses_relevant_retrieved_context(monkeypatch) -> None:
    monkeypatch.setattr(text_to_sql_api, "AI_SERVICE_API_KEY", "test-secret")
    captured_prompt: list[str] = []

    async def fake_complete(system_prompt: str, user_prompt: str) -> str:
        captured_prompt.append(user_prompt)
        return "SELECT area FROM sales"

    monkeypatch.setattr(llm_service, "_complete", fake_complete)
    response = TestClient(app).post(
        "/api/v1/text-to-sql/generate",
        headers={"x-api-key": "test-secret"},
        json={
            "question": "Compare product sales.",
            "table_name": "sales",
            "columns": [{"name": "area", "type": "TEXT"}],
            "retrieval_context": [
                {
                    "question": "Which products had the highest sales?",
                    "summary": "Product A led the previous result.",
                },
                {
                    "question": "How many returns were recorded?",
                    "summary": "Returns were grouped by country.",
                },
            ],
        },
    )

    assert response.status_code == 200
    assert (
        '"relevant_dataset_history": [{"question": "Which products had the highest sales?"'
        in captured_prompt[0]
    )
    assert "Returns were grouped by country." not in captured_prompt[0]


def test_chat_endpoint_returns_general_conversational_response(monkeypatch) -> None:
    monkeypatch.setattr(text_to_sql_api, "AI_SERVICE_API_KEY", "test-secret")
    captured_prompt: list[str] = []

    async def fake_complete(system_prompt: str, user_prompt: str) -> str:
        captured_prompt.append(user_prompt)
        return '{"responseType":"CHAT","answer":"A margin is revenue after costs."}'

    monkeypatch.setattr(llm_service, "_complete", fake_complete)
    response = TestClient(app).post(
        "/api/v1/chat/respond",
        headers={"x-api-key": "test-secret"},
        json={
            "question": "What is a profit margin?",
            "table_name": "sales",
            "columns": [{"name": "revenue", "type": "NUMERIC"}],
            "conversation": [],
            "retrieval_context": [],
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "responseType": "CHAT",
        "answer": "A margin is revenue after costs.",
    }
    assert '"question": "What is a profit margin?"' in captured_prompt[0]


def test_chat_endpoint_classifies_dataset_questions_for_query_execution(monkeypatch) -> None:
    monkeypatch.setattr(text_to_sql_api, "AI_SERVICE_API_KEY", "test-secret")

    async def fake_complete(system_prompt: str, user_prompt: str) -> str:
        return '{"responseType":"QUERY","answer":null}'

    monkeypatch.setattr(llm_service, "_complete", fake_complete)
    response = TestClient(app).post(
        "/api/v1/chat/respond",
        headers={"x-api-key": "test-secret"},
        json={
            "question": "Which product sold the most?",
            "table_name": "sales",
            "columns": [{"name": "product", "type": "TEXT"}],
        },
    )

    assert response.status_code == 200
    assert response.json() == {"responseType": "QUERY", "answer": None}


def test_text_to_sql_rejects_invalid_generated_sql(monkeypatch) -> None:
    monkeypatch.setattr(text_to_sql_api, "AI_SERVICE_API_KEY", "test-secret")

    async def fake_complete(system_prompt: str, user_prompt: str) -> str:
        return "DELETE FROM sales"

    monkeypatch.setattr(llm_service, "_complete", fake_complete)
    response = TestClient(app).post(
        "/api/v1/text-to-sql/generate",
        headers={"x-api-key": "test-secret"},
        json={
            "question": "Delete all sales",
            "table_name": "sales",
            "columns": [{"name": "area", "type": "TEXT"}],
        },
    )
    assert response.status_code == 422


def test_database_schema_endpoint_requires_key_and_returns_columns(monkeypatch) -> None:
    import app.main as main_module

    monkeypatch.setattr(text_to_sql_api, "AI_SERVICE_API_KEY", "test-secret")
    monkeypatch.setattr(
        main_module,
        "get_database_schema",
        lambda: [
            {
                "schema": "public",
                "table": "sales",
                "columns": [{"name": "revenue", "type": "NUMERIC", "nullable": True}],
            }
        ],
    )
    response = TestClient(app).get(
        "/api/v1/database/schema",
        headers={"x-api-key": "test-secret"},
    )
    assert response.status_code == 200
    assert response.json()["tables"][0]["columns"][0]["name"] == "revenue"


def test_business_insights_returns_findings_and_recommendations(monkeypatch) -> None:
    monkeypatch.setattr(text_to_sql_api, "AI_SERVICE_API_KEY", "test-secret")
    captured_prompt: list[str] = []

    async def fake_complete(system_prompt: str, user_prompt: str) -> str:
        captured_prompt.append(user_prompt)
        return (
            '{"summary":"Product A led revenue.",'
            '"findings":["Product A: 1200 revenue."],'
            '"recommendations":["Review Product A stock levels."]}'
        )

    monkeypatch.setattr(llm_service, "_complete", fake_complete)
    response = TestClient(app).post(
        "/api/v1/text-to-sql/insights",
        headers={"x-api-key": "test-secret"},
        json={
            "question": "Which product earned most?",
            "rows": [{"product": "A", "revenue": 1200}],
            "result_count": 500,
            "result_truncated": True,
        },
    )
    assert response.status_code == 200
    assert response.json() == {
        "summary": "Product A led revenue.",
        "findings": ["Product A: 1200 revenue."],
        "recommendations": ["Review Product A stock levels."],
        "chartConfiguration": {
            "type": "KPI_CARDS",
            "xAxis": None,
            "series": ["revenue"],
        },
    }
    assert '"result_truncated": true' in captured_prompt[0]


def test_business_insights_recommends_line_chart_for_monthly_results(monkeypatch) -> None:
    monkeypatch.setattr(text_to_sql_api, "AI_SERVICE_API_KEY", "test-secret")

    async def fake_complete(system_prompt: str, user_prompt: str) -> str:
        return '{"summary":"Sales increased.","findings":[],"recommendations":[]}'

    monkeypatch.setattr(llm_service, "_complete", fake_complete)
    response = TestClient(app).post(
        "/api/v1/text-to-sql/insights",
        headers={"x-api-key": "test-secret"},
        json={
            "question": "Compare monthly revenue.",
            "rows": [
                {"month": "2026-01", "revenue": 100},
                {"month": "2026-02", "revenue": 120},
            ],
            "result_count": 2,
        },
    )

    assert response.status_code == 200
    assert response.json()["chartConfiguration"] == {
        "type": "LINE_CHART",
        "xAxis": "month",
        "series": ["revenue"],
    }


def test_business_insights_recommends_bar_chart_for_category_comparison(monkeypatch) -> None:
    monkeypatch.setattr(text_to_sql_api, "AI_SERVICE_API_KEY", "test-secret")

    async def fake_complete(system_prompt: str, user_prompt: str) -> str:
        return '{"summary":"North has the highest sales.","findings":[],"recommendations":[]}'

    monkeypatch.setattr(llm_service, "_complete", fake_complete)
    response = TestClient(app).post(
        "/api/v1/text-to-sql/insights",
        headers={"x-api-key": "test-secret"},
        json={
            "question": "Which area has the highest sales?",
            "rows": [
                {"area": "North", "sales": 100},
                {"area": "South", "sales": 80},
            ],
            "result_count": 2,
        },
    )

    assert response.status_code == 200
    assert response.json()["chartConfiguration"] == {
        "type": "BAR_CHART",
        "xAxis": "area",
        "series": ["sales"],
    }


def test_business_insights_recommends_pie_chart_for_category_share(monkeypatch) -> None:
    monkeypatch.setattr(text_to_sql_api, "AI_SERVICE_API_KEY", "test-secret")

    async def fake_complete(system_prompt: str, user_prompt: str) -> str:
        return '{"summary":"Area sales share.","findings":[],"recommendations":[]}'

    monkeypatch.setattr(llm_service, "_complete", fake_complete)
    response = TestClient(app).post(
        "/api/v1/text-to-sql/insights",
        headers={"x-api-key": "test-secret"},
        json={
            "question": "Show sales share by area.",
            "rows": [
                {"area": "North", "sales": 100},
                {"area": "South", "sales": 80},
                {"area": "West", "sales": 50},
            ],
            "result_count": 3,
        },
    )

    assert response.status_code == 200
    assert response.json()["chartConfiguration"] == {
        "type": "PIE_CHART",
        "xAxis": "area",
        "series": ["sales"],
    }


def test_business_insights_handles_empty_results_without_llm(monkeypatch) -> None:
    monkeypatch.setattr(text_to_sql_api, "AI_SERVICE_API_KEY", "test-secret")

    async def unexpected_llm_call(system_prompt: str, user_prompt: str) -> str:
        raise AssertionError("LLM should not be called for an empty result.")

    monkeypatch.setattr(llm_service, "_complete", unexpected_llm_call)
    result = TestClient(app).post(
        "/api/v1/text-to-sql/insights",
        headers={"x-api-key": "test-secret"},
        json={
            "question": "Which product earned most?",
            "rows": [],
            "result_count": 0,
        },
    )
    assert result.status_code == 200
    assert result.json() == {
        "summary": "The query returned no matching rows.",
        "findings": [],
        "recommendations": [],
        "chartConfiguration": {"type": "TABLE", "xAxis": None, "series": []},
    }


def test_business_insights_rejects_malformed_llm_output(monkeypatch) -> None:
    monkeypatch.setattr(text_to_sql_api, "AI_SERVICE_API_KEY", "test-secret")

    async def fake_complete(system_prompt: str, user_prompt: str) -> str:
        return "Here is an unsupported plain-text answer."

    monkeypatch.setattr(llm_service, "_complete", fake_complete)
    response = TestClient(app).post(
        "/api/v1/text-to-sql/insights",
        headers={"x-api-key": "test-secret"},
        json={
            "question": "Which product earned most?",
            "rows": [{"product": "A", "revenue": 1200}],
            "result_count": 1,
        },
    )
    assert response.status_code == 502


def test_ai_report_generation_returns_structured_content(monkeypatch) -> None:
    monkeypatch.setattr(text_to_sql_api, "AI_SERVICE_API_KEY", "test-secret")
    captured_prompt: list[str] = []

    async def fake_complete(system_prompt: str, user_prompt: str) -> str:
        captured_prompt.append(user_prompt)
        return (
            '{"summary":"Revenue increased in the supplied results.",'
            '"findings":["January was higher than December."],'
            '"recommendations":["Review the next period after new data arrives."]}'
        )

    monkeypatch.setattr(report_service, "_complete", fake_complete)
    response = TestClient(app).post(
        "/api/v1/reports/generate",
        headers={"x-api-key": "test-secret"},
        json={
            "title": "Monthly performance",
            "queries": [
                {
                    "question": "Compare monthly revenue.",
                    "summary": "January: 120; December: 100.",
                    "created_at": "2026-01-31T12:00:00Z",
                }
            ],
        },
    )

    assert response.status_code == 200
    assert response.json()["findings"] == ["January was higher than December."]
    assert "January: 120; December: 100." in captured_prompt[0]


def test_ai_report_generation_rejects_malformed_provider_output(monkeypatch) -> None:
    monkeypatch.setattr(text_to_sql_api, "AI_SERVICE_API_KEY", "test-secret")

    async def fake_complete(system_prompt: str, user_prompt: str) -> str:
        return "unsupported output"

    monkeypatch.setattr(report_service, "_complete", fake_complete)
    response = TestClient(app).post(
        "/api/v1/reports/generate",
        headers={"x-api-key": "test-secret"},
        json={
            "title": "Monthly performance",
            "queries": [
                {
                    "question": "Compare monthly revenue.",
                    "summary": "January: 120; December: 100.",
                    "created_at": "2026-01-31T12:00:00Z",
                }
            ],
        },
    )

    assert response.status_code == 502