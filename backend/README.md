# AI + Web Development Projects

This repository contains two AI-powered web development projects.

---

# 1. AI-Powered Business Intelligence Platform

## Overview

An AI-powered BI platform that allows non-technical users to analyze business data using natural language. The system converts questions into SQL, retrieves data, generates visualizations, and provides AI-based business insights.

## Core Features

* Natural Language to SQL (Text-to-SQL)
* SQL validation and read-only protection
* AI-generated business insights
* Automatic charts and dashboards
* CSV/Excel upload and analysis
* Conversational follow-up questions
* Sales forecasting
* Anomaly detection
* AI-generated reports and PDF export
* Authentication and role-based access
* Query history and audit logs

## Workflow

```text
User Question
     ↓
LLM / RAG
     ↓
Text-to-SQL
     ↓
SQL Validation
     ↓
PostgreSQL
     ↓
Data Analysis
     ↓
Charts + AI Insights
```

## AI Components

* **LLM:** SQL generation, analysis, explanations
* **RAG:** Database schema and business context
* **Embeddings:** Semantic retrieval
* **Machine Learning:** Forecasting and anomaly detection
* **Pandas/NumPy:** Data processing

## Technology Stack

* Frontend: Next.js, React, TypeScript, Tailwind CSS
* Backend: Node.js, Express/NestJS
* AI: Python, FastAPI, LLM APIs
* Database: PostgreSQL, pgvector
* ML: Scikit-learn
* Charts: Recharts/ECharts
* Deployment: Docker, Vercel/Cloud

## Main Requirements

* Secure authentication and RBAC
* Natural-language data querying
* Safe SQL execution
* Data upload and processing
* Dashboard and visualization
* Forecasting and anomaly detection
* Report generation

## Audit, conversations, and dashboards

The backend exposes these APIs under `/api/v1`. Use the existing access-token cookie
or a `Bearer` access token. Conversations and dashboards are scoped to their owner;
audit-log endpoints require the `ADMIN` or `SUPER_ADMIN` role.

### Conversations

* `POST /conversations` — create a conversation (`{ "title": "Sales" }`)
* `GET /conversations?page=1&limit=25` — list the signed-in user's conversations
* `GET /conversations/:id` — retrieve a conversation and its latest 20 messages
* `PATCH /conversations/:id` — rename or archive/unarchive it
* `DELETE /conversations/:id` — delete a conversation and its messages
* `GET /conversations/:id/messages?page=1&limit=25` — list messages
* `POST /conversations/:id/messages` — add a user text message
* `DELETE /conversations/:id/messages/:messageId` — delete one owned message
* `POST /conversations/:id/ask` — run a dataset question, e.g.
  `{ "datasetId": "<uuid>", "question": "Compare sales with last month." }`

Asking uses the existing read-only Text-to-SQL service and the latest bounded
conversation history. SQL, assistant insight, and query references are persisted
as typed messages. Query errors saved to history are sanitized; raw database errors
are not exposed to clients.

### Dashboards

* `POST /dashboards`, `GET /dashboards`, `GET /dashboards/:id`,
  `PATCH /dashboards/:id`, and `DELETE /dashboards/:id`
* `GET /dashboards/:id/widgets` — list widgets
* `POST /dashboards/:id/widgets` — save a visualization, optionally referencing
  an owned successful query with `queryId`
* `PATCH /dashboards/:id/widgets/:widgetId` and
  `DELETE /dashboards/:id/widgets/:widgetId`
* `PATCH /dashboards/:id/widgets/reorder` — set widget positions
* `POST /dashboards/:id/widgets/:widgetId/refresh` — revalidate and safely
  re-execute its saved read-only query against the current owned dataset

Widget refresh returns `rows`, `columns`, a chart suggestion, and the saved query
summary. Dashboard records store query references and visualization configuration,
not copied business datasets.

### Audit

* `GET /audit` — paginated/filterable audit search
* `GET /audit/:id` — retrieve a single record
* `GET /audit/user/:userId` — filter records for a user
* `GET /audit/resource/:resourceType/:resourceId` — filter records for a resource

List filters include `page`, `limit` (maximum 100), `userId`, `action`,
`category`, `resourceType`, `resourceId`, `status`, `from`, `to`, and `search`.
Audit metadata is scrubbed for password/token/secret-like keys before storage.
Login, logout, user creation, business-data changes, query execution/rejection,
conversation/message changes, analytics, report generation/export, and dashboard
operations are recorded.

### Frontend

The standalone Next.js application lives in `frontend/` and communicates with
the API through a same-origin rewrite. This keeps the access and refresh tokens
in HTTP-only cookies rather than browser storage.

```sh
# From the repository root
pnpm --dir backend install

# Terminal 1: run the backend
pnpm --dir backend dev

# Terminal 2: run the frontend
pnpm --dir frontend install
pnpm --dir frontend dev
```

The frontend expects the backend at `http://localhost:8000` by default. Override
`BACKEND_API_URL` in `frontend/.env.local` if it is running elsewhere. Set
`FRONTEND_URL` in the backend environment to `http://localhost:3000`. The app
includes a sign-in page, data overview, contextual conversations, saved
dashboards/widgets, and an administrator-only audit browser; role restrictions
and record ownership continue to be enforced by the backend.

### Prisma and tests

The active BI Prisma schema is split across `prisma/schema/*.prisma`. Validate it
and regenerate the client with:

```sh
pnpm exec prisma validate
pnpm exec prisma generate
pnpm test
pnpm build
```

**Review the schema-transition migration before applying it to another
environment.** The project history starts with the earlier healthcare schema;
`20261004120000_bi_platform_schema` transitions to the active BI schema and drops
the legacy `patients` and `users` tables. Apply it only where those tables have
been backed up or are confirmed disposable. Never apply it to production without
an explicit data-retention plan.

---

# 2. AI Interview & Recruitment Intelligence System

## Overview

An AI-powered recruitment platform that assists recruiters throughout the hiring process by analyzing job descriptions, resumes, candidate-job matching, interviews, answers, and skill gaps.

## Core Features

* Recruiter and candidate dashboards
* AI job-description analysis
* Skill extraction
* PDF resume parsing
* Semantic resume-job matching
* AI-generated interview questions
* Adaptive AI interviews
* Technical coding interviews
* Automated test-case evaluation
* Voice interview and speech-to-text
* AI-assisted answer analysis
* Skill-gap analysis
* Semantic candidate search
* Interview analytics
* Automated recruitment reports
* Role-based access and audit logs

## Workflow

```text
Job Creation
     ↓
AI Job Analysis
     ↓
Candidate Application
     ↓
Resume Parsing
     ↓
Semantic Matching
     ↓
AI Interview
     ↓
Answer Analysis
     ↓
Skill Gap
     ↓
Recruiter Report
     ↓
Human Review
```

## AI Components

* **LLM/NLP:** Resume, job, interview and answer analysis
* **Embeddings:** Candidate-job matching and semantic search
* **RAG:** Company and interview guidelines
* **Speech-to-Text:** Voice interviews
* **Machine Learning:** Matching and recruitment analytics

## Technology Stack

* Frontend: Next.js, React, TypeScript, Tailwind CSS, Shadcn UI
* Backend: Node.js, Express/NestJS
* Database: PostgreSQL, Prisma
* Cache: Redis
* AI: Python, FastAPI, LLM APIs
* Vector DB: pgvector/Qdrant/Pinecone
* Code Editor: Monaco Editor
* Charts: Recharts
* Deployment: Docker, Vercel/AWS/Railway

## Main Requirements

* Authentication and RBAC
* Job and candidate management
* Resume upload and parsing
* Semantic candidate matching
* AI interview system
* Coding assessment
* Voice interview support
* Skill-gap analysis
* Recruitment analytics and reports

## Ethical Design

The system is a **decision-support tool**, not an automatic hiring or rejection engine. AI-generated results should be explainable, privacy-aware, and reviewed by human recruiters.

---

# Future Scope

Both projects can be extended with:

* Advanced AI agents
* Real-time analytics
* Multilingual support
* Advanced RAG
* More ML models
* Cloud deployment
* Research and comparative AI evaluation

---

## License

For educational, academic, research, and portfolio purposes.
