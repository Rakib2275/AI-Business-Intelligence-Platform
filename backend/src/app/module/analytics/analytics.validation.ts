import { z } from "zod";

const columnName = z.string().trim().min(1).max(200);
const featureColumns = z
	.array(columnName)
	.min(1)
	.max(20)
	.refine((columns) => new Set(columns).size === columns.length);

export const forecastSchema = z.object({
	datasetId: z.string().uuid(),
	dateColumn: columnName,
	valueColumn: columnName,
	periods: z.number().int().min(1).max(90).default(14),
});

export const trainForecastSchema = z.object({
	datasetId: z.string().uuid(),
	dateColumn: columnName,
	valueColumn: columnName,
});

export const anomalySchema = z.object({
	datasetId: z.string().uuid(),
	featureColumns,
});

export const trainAnomalySchema = z.object({
	datasetId: z.string().uuid(),
	featureColumns,
});
