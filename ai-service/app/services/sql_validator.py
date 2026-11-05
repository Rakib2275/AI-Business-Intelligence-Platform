import re

import sqlglot
from sqlglot import exp
from sqlglot.errors import ParseError


ALLOWED_FUNCTIONS = {
    "ABS",
    "AVG",
    "COALESCE",
    "COUNT",
    "DATE_PART",
    "DATE_TRUNC",
    "EXTRACT",
    "LENGTH",
    "LOWER",
    "MAX",
    "MIN",
    "NULLIF",
    "ROUND",
    "SUM",
    "TIMESTAMP_TRUNC",
    "TRIM",
    "UPPER",
}


def validate_read_only_sql(sql: str, table_name: str) -> str:
    if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", table_name):
        raise ValueError("Invalid dataset table name.")

    try:
        statements = sqlglot.parse(sql, read="postgres")
    except ParseError as error:
        raise ValueError("Generated SQL could not be parsed.") from error

    if len(statements) != 1 or not isinstance(statements[0], exp.Select):
        raise ValueError("Only one read-only SELECT statement is allowed.")

    query = statements[0]
    if query.args.get("with") or query.args.get("into"):
        raise ValueError("CTEs and SELECT INTO are not allowed.")

    tables = list(query.find_all(exp.Table))
    if not tables or any(
        table.name.lower() != table_name.lower()
        or table.db
        or table.catalog
        for table in tables
    ):
        raise ValueError("The query can only read from the selected dataset.")

    for function in query.find_all(exp.Func):
        if function.sql_name().upper() not in ALLOWED_FUNCTIONS:
            raise ValueError("The query contains a function that is not allowed.")

    return sql.strip().removesuffix(";").strip()