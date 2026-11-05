import pytest

from app.services.sql_validator import validate_read_only_sql


def test_accepts_select_for_the_selected_dataset() -> None:
    sql = "SELECT area, SUM(revenue) AS total FROM sales GROUP BY area"
    assert validate_read_only_sql(sql, "sales") == sql


def test_accepts_monthly_date_aggregation() -> None:
    sql = "SELECT DATE_TRUNC('month', sold_at), SUM(revenue) FROM sales GROUP BY 1"
    assert validate_read_only_sql(sql, "sales") == sql


@pytest.mark.parametrize(
    "sql",
    [
        "DELETE FROM sales",
        "SELECT * FROM sales; SELECT * FROM users",
        "SELECT * INTO copied FROM sales",
        "WITH totals AS (SELECT * FROM sales) SELECT * FROM totals",
        "SELECT * FROM users",
        "SELECT pg_sleep(10) FROM sales",
        "SELECT * FROM public.sales",
    ],
)
def test_rejects_unsafe_queries(sql: str) -> None:
    with pytest.raises(ValueError):
        validate_read_only_sql(sql, "sales")