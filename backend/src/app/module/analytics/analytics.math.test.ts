import assert from "node:assert/strict";
import test from "node:test";
import { findAnomalies } from "./analytics.math.js";

test("detects numeric values outside the 1.5 IQR bounds", () => {
	const result = findAnomalies(
		[1, 2, 2, 3, 4, 100].map((value) => ({ value })),
		"value",
	);
	assert.equal(result.anomalies.length, 1);
	assert.deepEqual(result.anomalies[0], { rowIndex: 5, value: 100 });
});
