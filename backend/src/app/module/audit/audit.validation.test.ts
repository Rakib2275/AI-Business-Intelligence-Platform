import assert from "node:assert/strict";
import test from "node:test";
import { auditQuerySchema } from "./audit.validation.js";

test("audit filters accept bounded pagination and date filters", () => {
	const result = auditQuerySchema.parse({
		page: "2",
		limit: "50",
		action: "QUERY_EXECUTED",
		from: "2026-01-01T00:00:00.000Z",
		to: "2026-01-31T23:59:59.000Z",
	});
	assert.equal(result.page, 2);
	assert.equal(result.limit, 50);
	assert.equal(result.action, "QUERY_EXECUTED");
});

test("audit filters reject invalid IDs, limits, and reversed date ranges", () => {
	assert.equal(
		auditQuerySchema.safeParse({ userId: "not-a-uuid" }).success,
		false,
	);
	assert.equal(auditQuerySchema.safeParse({ limit: "101" }).success, false);
	assert.equal(
		auditQuerySchema.safeParse({
			from: "2026-02-01T00:00:00.000Z",
			to: "2026-01-01T00:00:00.000Z",
		}).success,
		false,
	);
});
