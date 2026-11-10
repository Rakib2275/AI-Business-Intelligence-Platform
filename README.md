
<img width="1918" height="911" alt="Screenshot 2026-11-10 174317" src="https://github.com/user-attachments/assets/afbbc617-6aec-4189-9d3c-89cf68ffbc8e" />

# AI-Powered Business Intelligence Platform

An AI-powered Business Intelligence (BI) platform that helps
non-technical users explore business data using natural-language
questions. It converts questions into SQL, retrieves information from
PostgreSQL, analyzes results, generates business insights, and supports
interactive visualizations and sales forecasting.

## Overview

The platform makes business data analysis easier for managers and
analysts without requiring them to write SQL manually.

### Core Workflow

``` text
User Question
     |
     v
LLM / Text-to-SQL
     |
     v
SQL Validation (Read-only Protection)
     |
     v
PostgreSQL
     |
     v
Query Result
     |
     v
AI Business Analysis
     |
     v
Charts, Dashboard and Business Insights
```

## Key Features

-   **Natural Language to SQL:** Convert business questions into SQL
    queries.
-   **SQL Validation:** Validate generated SQL and protect the database
    with read-only query execution.
-   **Business Insights:** Generate summaries and explanations from
    query results.
-   **Data Visualization:** Prepare chart data for interactive
    dashboards.
-   **Conversational Queries:** Support follow-up questions with
    conversation context.
-   **CSV/Excel Analysis:** Upload and analyze business datasets.
-   **Sales Forecasting:** Use historical sales data to estimate future
    sales.
-   **Anomaly Detection:** Identify unusual patterns in business
    activity.
-   **AI Reports:** Generate business summaries and reports.
-   **Authentication and Permissions:** Support role-based access, query
    history, and audit logs.

## Technology Stack

  Layer                 Technologies
  --------------------- ------------------------------------------
  Frontend              Next.js, React, TypeScript, Tailwind CSS
  Backend               Node.js, Express.js
  AI Service            Python, FastAPI
  Database              PostgreSQL
  Data Processing       Pandas, NumPy
  Machine Learning      Scikit-learn and forecasting models
  AI / Language Model   LLM and embedding APIs
  Visualization         Recharts / ECharts

## Project Architecture

The application uses a separate AI service so that the main backend and
AI-related workloads remain independently organized.

``` text
Frontend (Next.js)
       |
       v
Backend API (Node.js + Express)
       |
       +---------------------> PostgreSQL
       |
       v
AI Service (Python + FastAPI)
       |
       +--> LLM Integration
       +--> Text-to-SQL
       +--> SQL Validation
       +--> Business Insights
       +--> Forecasting
       +--> Anomaly Detection
```

## Main AI Capabilities

### 1. Text-to-SQL

Users can ask questions such as:

-   Which product sold the most?
-   Which product had the highest sales last month?
-   Which country or area generated the highest sales?
-   What is the total revenue?

The AI service uses database schema context to generate SQL. Generated
SQL should be validated before execution.

### 2. Business Insights

The platform can analyze query results and provide readable
explanations, including product performance, revenue summaries, and
sales trends.

### 3. Data Visualization

Query results can be transformed into structured chart configurations
for frontend dashboards, such as:

-   Bar charts for product comparisons
-   Line charts for sales trends
-   Pie charts for sales distribution
-   KPI cards for key business metrics

### 4. Sales Forecasting

Historical sales records can be processed to estimate future sales and
product demand. Forecast quality depends on the amount, quality, and
time coverage of the historical data.

### 5. Anomaly Detection

Analytics models can help identify unusual changes in sales, revenue, or
transaction patterns.

## Dataset

The project can be tested with retail transaction datasets such as
**Online Retail**.

Suggested dataset: - [UCI Online Retail
Dataset](https://archive.ics.uci.edu/dataset/352/online+retail)

The dataset includes invoice number, product code, product description,
quantity, invoice date, unit price, customer ID, and country.

Example business metric:

``` text
Revenue = Quantity × Unit Price
```

The Online Retail dataset contains country information, not detailed
city/area information. Area-wise analysis requires a dataset that
includes the relevant location fields.

## Getting Started

### Prerequisites

-   Node.js
-   pnpm or npm
-   Python
-   Conda (if using the `visa` environment)
-   PostgreSQL

### 1. Clone the Repository

``` bash
git clone <YOUR_REPOSITORY_URL>
cd <YOUR_PROJECT_FOLDER>
```

### 2. Run the Backend

Open the backend directory and install dependencies:

``` bash
pnpm install
```

Configure backend environment variables, then run the development script
defined in `package.json`. For example:

``` bash
pnpm run dev
```

### 3. Run the AI Service

Open the AI service directory:

``` bash
cd ai-service
```

Activate the Conda environment if you use the environment named `visa`:

``` bash
conda activate visa
```

Install Python dependencies:

``` bash
pip install -r requirements.txt
```

Create an `ai-service/.env` file:

``` env
DATABASE_URL=your_postgresql_connection_url
```

Add any LLM provider credentials required by your implementation. Never
commit real passwords, API keys, or database credentials.

Start FastAPI:

``` bash
python -m uvicorn app.main:app --reload --port 8000
```

### 4. Open the AI Service

-   API base URL: `http://127.0.0.1:8000`
-   Swagger documentation: `http://127.0.0.1:8000/docs`
-   Health check: `http://127.0.0.1:8000/health`
-   Database health check: `http://127.0.0.1:8000/health/database`

Available API routes depend on the current implementation. The service
may include endpoints for schema retrieval, Text-to-SQL generation, and
business insights.

### 5. Run the Frontend

Open the frontend directory, install dependencies, configure its
environment variables, and run the development script defined in
`package.json`. For example:

``` bash
pnpm install
pnpm run dev
```

## Example Questions

After connecting a supported dataset, try questions such as:

``` text
Which product sold the most?
What was the total revenue last month?
Which country generated the highest sales?
Show monthly sales trends.
Which products may have higher sales next month?
Are there any unusual changes in sales?
```

Available questions depend on the columns and records in the connected
database.

## Security Notes

-   Keep `.env` files out of version control.
-   Use environment variables for database credentials and API keys.
-   Validate generated SQL before execution.
-   Restrict AI-generated database queries to approved read-only
    operations.
-   Apply authentication and role-based permissions in the backend.
-   Never expose database credentials or privileged database access to
    the frontend.

## Development Status

This repository is being developed as an AI Business Intelligence
project. Feature availability depends on the implementation and testing
status of each module. Refer to the API documentation and source code
for currently available endpoints.

## Future Improvements

-   Improve Text-to-SQL accuracy and evaluation.
-   Add schema-aware context retrieval and RAG.
-   Improve forecasting with model comparison and evaluation.
-   Expand anomaly detection.
-   Add conversational context for follow-up questions.
-   Improve report generation and PDF export.

## Contributors

-   Rakibul Hasan
-   Abu Syeed Asad
-   Rasel Mahmud
