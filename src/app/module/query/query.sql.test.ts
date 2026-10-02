import assert from "node:assert/strict";
import test from "node:test";
import { assertSafeSql } from "./query.sql";

test("accepts a SELECT over the selected dataset", () => {
	assert.doesNotThrow(() =>
		assertSafeSql(
			"SELECT region, SUM(revenue) AS total FROM sales GROUP BY region ORDER BY total DESC",
			"sales",
		),
	);
});

test("rejects writes, stacked statements, and SELECT INTO", () => {
	for (const sql of [
		"DELETE FROM sales",
		"SELECT * FROM sales; SELECT * FROM users",
		"SELECT region INTO copied FROM sales",
	]) {
		assert.throws(() => assertSafeSql(sql, "sales"));
	}
});

test("rejects access to tables outside the selected dataset", () => {
	assert.throws(() => assertSafeSql("SELECT email FROM users", "sales"));
	assert.throws(() =>
		assertSafeSql("SELECT s.region FROM sales s JOIN users u ON true", "sales"),
	);
});

test("rejects CTEs and dangerous functions", () => {
	assert.throws(() =>
		assertSafeSql("WITH rows AS (SELECT * FROM sales) SELECT * FROM rows", "sales"),
	);
	assert.throws(() => assertSafeSql("SELECT pg_sleep(10) FROM sales", "sales"));
});