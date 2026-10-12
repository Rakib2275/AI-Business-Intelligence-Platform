import assert from "node:assert/strict";
import test from "node:test";
import {
	createWidgetSchema,
	reorderWidgetsSchema,
} from "./dashboard.validation.js";

test("dashboard widget configuration accepts JSON and supported widget types", () => {
	const result = createWidgetSchema.parse({
		title: "Revenue by month",
		type: "LINE_CHART",
		queryId: "79e47a38-27ac-4eb6-8cc5-7ed87c2e0041",
		configuration: { xAxis: "month", yAxis: "revenue", showLegend: true },
	});
	assert.equal(result.type, "LINE_CHART");
});

test("dashboard widgets reject unsupported types and duplicate reorder positions", () => {
	assert.equal(
		createWidgetSchema.safeParse({ title: "Unsafe", type: "CUSTOM" }).success,
		false,
	);
	assert.equal(
		reorderWidgetsSchema.safeParse({
			widgets: [
				{ id: "79e47a38-27ac-4eb6-8cc5-7ed87c2e0041", position: 0 },
				{ id: "29e47a38-27ac-4eb6-8cc5-7ed87c2e0041", position: 0 },
			],
		}).success,
		false,
	);
});
