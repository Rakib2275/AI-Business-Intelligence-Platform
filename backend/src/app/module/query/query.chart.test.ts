import assert from "node:assert/strict";
import test from "node:test";
import { suggestChartConfiguration } from "./query.chart.js";

test("chart suggestions use time categories for line charts", () => {
	assert.deepEqual(
		suggestChartConfiguration([
			{ month: "2026-01", revenue: "12000" },
			{ month: "2026-02", revenue: "15000" },
		]),
		{ type: "LINE_CHART", xAxis: "month", series: ["revenue"] },
	);
});

test("chart suggestions fall back to tables without a category and measure", () => {
	assert.deepEqual(suggestChartConfiguration([{ note: "No numeric column" }]), {
		type: "TABLE",
		series: [],
	});
});
