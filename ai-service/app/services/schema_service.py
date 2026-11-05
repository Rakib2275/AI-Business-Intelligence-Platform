from sqlalchemy import inspect

from app.config import engine


def get_database_schema() -> list[dict[str, object]]:
    if engine is None:
        raise RuntimeError("DATABASE_URL is not configured.")
    inspector = inspect(engine)
    tables: list[dict[str, object]] = []

    for table_name in inspector.get_table_names(schema="public"):
        columns = inspector.get_columns(table_name, schema="public")
        tables.append(
            {
                "schema": "public",
                "table": table_name,
                "columns": [
                    {
                        "name": column["name"],
                        "type": str(column["type"]),
                        "nullable": column["nullable"],
                    }
                    for column in columns
                ],
            }
        )

    return tables