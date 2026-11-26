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

Local development defaults to filesystem storage under
`ai-service/models/artifacts` (`MODEL_ARTIFACT_BACKEND=local`). The artifact
directory is ignored by Git. To use a different local path, set
`MODEL_ARTIFACT_LOCAL_DIR`; relative paths are resolved from `ai-service`.

For deployment, set `MODEL_ARTIFACT_BACKEND=s3` and configure a private
S3-compatible bucket with `MODEL_ARTIFACT_BUCKET`, `MODEL_ARTIFACT_PREFIX`, and
`MODEL_ARTIFACT_REGION`. For MinIO or another compatible service, also set
`MODEL_ARTIFACT_S3_ENDPOINT_URL`. Prefer workload IAM/role credentials in
production; otherwise provide AWS-compatible credentials through the deployment
secret manager. A container's local filesystem may be ephemeral or isolated
between replicas, so use shared persistent S3-compatible storage for deployed
instances. Enable bucket versioning, encryption, and a lifecycle policy for old
model versions. Never accept or load user-uploaded joblib files.

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
- `POST /api/v1/chat/respond` — classify a conversation turn as a dataset query
  or a direct conversational response, using the supplied schema and conversation
  context (requires `x-api-key`).
- `POST /api/v1/text-to-sql/insights` — summarize SQL results with evidence-based
  findings and suggested next steps (requires `x-api-key`). Send the question,
  at most 50 result rows, the query result count, and whether the 500-row cap
  was reached. The response includes a plain-language `summary`, up to five
  `findings`, up to three data-grounded `recommendations`, and a
  `chartConfiguration` selected from the result shape. It can recommend
  `TABLE`, `KPI_CARDS` for a single-row result, `LINE_CHART` for time-based
  results, `PIE_CHART` for small category-share results, or `BAR_CHART` for
  other category comparisons. The configuration names the result columns used
  for the x-axis and series; it does not execute or transform the query.
- `POST /api/v1/reports/generate` — synthesize an executive summary, findings,
  and recommendations from successful query summaries (requires `x-api-key`).
- `POST /api/v1/forecasting/train` — chronologically evaluate and train a
  dataset-specific forecast model, then save a versioned joblib artifact in the
  configured local directory or private bucket (requires `x-api-key`).
- `POST /api/v1/forecasting/predict` — load the matching saved artifact and
  return future periods without fitting the model again (requires `x-api-key`).
  Prediction is rejected when the dataset revision differs from the revision
  used to train the artifact; retrain after changing the dataset.
- `POST /api/v1/anomalies/train` — fit an Isolation Forest model to selected
  numeric dataset features and save a versioned artifact in the configured
  storage backend.
- `POST /api/v1/anomalies/detect` — load the matching saved artifact and score
  rows without fitting again. Results are limited to the 1,000 highest-scoring
  flagged rows; retrain after the dataset revision changes. Anomaly flags are
  review candidates, not confirmed incidents.

  Conversational query requests retrieve at most 20 successful prior questions and
  summaries for the same authenticated user and dataset. The AI service ranks those
  documents lexically and includes only the top three relevant matches in the
  prompt; it does not mix histories across users or datasets. Dataset questions
  still pass through SQL validation and read-only execution, while general
  explanations are saved as normal conversation messages.

The Express API exposes authenticated `POST /api/v1/analytics/forecast/train`
and `POST /api/v1/analytics/forecast` routes. It verifies dataset ownership,
aggregates the selected date/value columns, and passes a dataset revision to the
AI service. Training reports chronological holdout MAE/RMSE; the final model is
then refit on all valid history and saved. The forecasting baseline is
scikit-learn linear regression with optional Fourier seasonality; it is a
baseline, so compare its metrics with notebook experiments before relying on
business decisions.

Anomaly workflows are exposed through authenticated
`POST /api/v1/analytics/anomalies/train` and
`POST /api/v1/analytics/anomalies` routes. They enforce dataset ownership,
select 1–20 numeric features, and bind the saved model to the dataset revision.
The model uses a fixed 5% contamination setting and median-imputes missing
feature values; its in-sample flagged count is descriptive, not a supervised
accuracy metric.

The existing authenticated report endpoint now uses the AI service to generate
the report summary and evidence-based findings/recommendations before producing
the PDF. If AI generation fails, the report is marked failed rather than
returning a success-shaped summary-only PDF.

Run the focused tests with `python -m pytest`.