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
