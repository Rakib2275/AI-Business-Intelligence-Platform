# AI Service

Private FastAPI service for schema-aware Text-to-SQL generation and result
summaries. The Node backend remains responsible for user/dataset authorization,
SQL validation, read-only execution, and conversation persistence. The AI
service never executes generated SQL.

## Setup

From this directory, create and activate a Python 3.13 virtual environment:

```powershell
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirement.txt -r requirements-ai.txt
Copy-Item .env.example .env
```

Set `OPENAI_API_KEY` and `AI_SERVICE_API_KEY` in `ai-service/.env`. Set the
same `AI_SERVICE_API_KEY` and `AI_SERVICE_URL=http://127.0.0.1:8001` in
`backend/.env`. Set `DATABASE_URL` when using the database health check or schema
endpoint; use a read-only PostgreSQL account.

Run the API from this directory:

```powershell
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```

The backend sends the selected dataset's table name, column names/types,
description, question, and recent conversation to the service. It does not send
dataset rows for SQL generation. The SQL is validated by both services and then
executed by the backend against the selected dataset with a read-only transaction,
a statement timeout, and a 500-row cap.

## Endpoints

- `GET /health` — process health.
- `GET /health/database` — PostgreSQL connection check.
- `GET /api/v1/database/schema` — public-schema table/column metadata (requires
  `x-api-key`).
- `POST /api/v1/text-to-sql/generate` — generate and validate a SELECT statement
  (requires `x-api-key`).
- `POST /api/v1/text-to-sql/insights` — summarize SQL results with evidence-based
  findings and suggested next steps (requires `x-api-key`). Send the question,
  at most 50 result rows, the query result count, and whether the 500-row cap
  was reached. The response includes a plain-language `summary`, up to five
  `findings`, and up to three data-grounded `recommendations`.

Run the focused tests with `python -m pytest`.