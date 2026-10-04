import { z } from "zod";

const widgetTypeSchema = z.enum([
	"KPI",
	"TABLE",
	"BAR_CHART",
	"LINE_CHART",
	"PIE_CHART",
	"AREA_CHART",
	"SCATTER",
	"METRIC",
	"TEXT",
	"INSIGHT",
]);

const jsonObjectSchema = z.record(z.string(), z.json());

export const dashboardIdSchema = z.object({ id: z.uuid() });
export const widgetParamsSchema = z.object({
	id: z.uuid(),
	widgetId: z.uuid(),
});
export const dashboardPaginationSchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const createDashboardSchema = z.object({
	name: z.string().trim().min(1).max(120),
	description: z.string().trim().max(1000).optional(),
	isDefault: z.boolean().optional(),
	layout: jsonObjectSchema.optional(),
});

export const updateDashboardSchema = z
	.object({
		name: z.string().trim().min(1).max(120).optional(),
		description: z.string().trim().max(1000).nullable().optional(),
		isDefault: z.boolean().optional(),
		layout: jsonObjectSchema.nullable().optional(),
	})
	.refine((value) => Object.keys(value).length > 0, {
		message: "At least one dashboard field must be provided.",
	});

export const createWidgetSchema = z.object({
	title: z.string().trim().min(1).max(120),
	type: widgetTypeSchema,
	queryId: z.uuid().optional(),
	position: z.number().int().min(0).max(10_000).optional(),
	configuration: jsonObjectSchema.optional(),
});

export const updateWidgetSchema = z
	.object({
		title: z.string().trim().min(1).max(120).optional(),
		type: widgetTypeSchema.optional(),
		queryId: z.uuid().nullable().optional(),
		position: z.number().int().min(0).max(10_000).optional(),
		configuration: jsonObjectSchema.nullable().optional(),
	})
	.refine((value) => Object.keys(value).length > 0, {
		message: "At least one widget field must be provided.",
	});

export const reorderWidgetsSchema = z.object({
	widgets: z
		.array(
			z.object({
				id: z.uuid(),
				position: z.number().int().min(0).max(10_000),
			}),
		)
		.min(1)
		.max(100)
		.refine(
			(widgets) =>
				new Set(widgets.map((widget) => widget.id)).size === widgets.length,
			{
				message: "Widget IDs must be unique.",
			},
		)
		.refine(
			(widgets) =>
				new Set(widgets.map((widget) => widget.position)).size ===
				widgets.length,
			{
				message: "Widget positions must be unique.",
			},
		),
});
