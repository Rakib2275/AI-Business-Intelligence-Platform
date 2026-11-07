from fastapi.testclient import TestClient

import app.api.text_to_sql as text_to_sql_api
import app.services.llm_service as llm_service
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
    }
    assert '"result_truncated": true' in captured_prompt[0]


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