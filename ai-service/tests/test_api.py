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