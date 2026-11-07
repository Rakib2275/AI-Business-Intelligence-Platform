import assert from "node:assert/strict";
import test from "node:test";
import {
	parseChartConfiguration,
	suggestChartConfiguration,
} from "./query.chart.js";

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

test("AI chart configurations are validated against the returned rows", () => {
	const rows = [
		{ month: "2026-01", revenue: "12000" },
		{ month: "2026-02", revenue: "15000" },
	];
	assert.deepEqual(
		parseChartConfiguration(
			{ type: "LINE_CHART", xAxis: "month", series: ["revenue"] },
			rows,
		),
		{ type: "LINE_CHART", xAxis: "month", series: ["revenue"] },
	);
	assert.equal(
		parseChartConfiguration(
			{ type: "BAR_CHART", xAxis: "month", series: ["missing"] },
			rows,
		),
		undefined,
	);
	assert.equal(
		parseChartConfiguration(
			{ type: "PIE_CHART", xAxis: "revenue", series: ["revenue"] },
			rows,
		),
		undefined,
	);
});

test("AI KPI and pie chart configurations are accepted", () => {
	assert.deepEqual(
		parseChartConfiguration(
			{ type: "KPI_CARDS", series: ["revenue", "orders"] },
			[{ revenue: 1200, orders: 14 }],
		),
		{ type: "KPI_CARDS", series: ["revenue", "orders"] },
	);
	assert.deepEqual(
		parseChartConfiguration(
			{ type: "PIE_CHART", xAxis: "area", series: ["sales"] },
			[
				{ area: "North", sales: 100 },
				{ area: "South", sales: 80 },
			],
		),
		{ type: "PIE_CHART", xAxis: "area", series: ["sales"] },
	);
});
