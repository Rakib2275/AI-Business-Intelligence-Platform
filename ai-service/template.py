
import os
from pathlib import Path

project_name = "app"

list_of_files = [
    f"{project_name}/__init__.py",

    # API routes
    f"{project_name}/api/__init__.py",
    f"{project_name}/api/text_to_sql.py",
    f"{project_name}/api/insights.py",
    f"{project_name}/api/forecasting.py",
    f"{project_name}/api/anomaly.py",
    f"{project_name}/api/chat.py",

    # Schemas
    f"{project_name}/schemas/__init__.py",
    f"{project_name}/schemas/query_schema.py",
    f"{project_name}/schemas/forecast_schema.py",

    # AI services
    f"{project_name}/services/__init__.py",
    f"{project_name}/services/llm_service.py",
    f"{project_name}/services/schema_service.py",
    f"{project_name}/services/sql_validator.py",
    f"{project_name}/services/insight_service.py",
    f"{project_name}/services/rag_service.py",

    # Machine learning
    f"{project_name}/ml/__init__.py",
    f"{project_name}/ml/forecasting.py",
    f"{project_name}/ml/anomaly_detection.py",
    f"{project_name}/ml/train_forecast.py",

    # Configuration
    "tests/__init__.py",
    "tests/test_api.py",
    "tests/test_sql_validator.py",
    "models/.gitkeep",
    "requirements.txt",
    ".env",
    ".env.example",
    ".gitignore",
    "README.md",
]

for filepath in list_of_files:
    filepath = Path(filepath)
    filedir, filename = os.path.split(filepath)

    if filedir:
        os.makedirs(filedir, exist_ok=True)

    if not filepath.exists() or filepath.stat().st_size == 0:
        filepath.touch()
        print(f"Created: {filepath}")
    else:
        print(f"Already exists, skipping: {filepath}")

print("\nAI service folder structure created successfully!")
