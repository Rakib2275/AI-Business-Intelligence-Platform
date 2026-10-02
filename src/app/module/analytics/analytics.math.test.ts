import assert from "node:assert/strict";
import test from "node:test";
import { calculateForecast, findAnomalies } from "./analytics.math";

test("forecasts later values using sorted date/value observations", () => {
	const result = calculateForecast(
		[
			{ day: "2026-01-03", sales: "30" },
			{ day: "2026-01-01", sales: "10" },
			{ day: "2026-01-02", sales: "20" },
		],
		"day",
		"sales",
		2,
	);
	assert.equal(result.forecast.length, 2);
	assert.equal(result.forecast[0].date, "2026-01-04T00:00:00.000Z");
	assert.equal(result.forecast[0].value, 40);
});

test("requires enough valid points for forecasting", () => {
	assert.throws(() => calculateForecast([{ day: "not-a-date", sales: 2 }], "day", "sales", 1));
});

test("detects numeric values outside the 1.5 IQR bounds", () => {
	const result = findAnomalies(
		[1, 2, 2, 3, 4, 100].map((value) => ({ value })),
		"value",
	);
	assert.equal(result.anomalies.length, 1);
	assert.deepEqual(result.anomalies[0], { rowIndex: 5, value: 100 });
});