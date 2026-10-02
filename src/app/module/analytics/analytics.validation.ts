import { z } from "zod";

const columnName = z.string().trim().min(1).max(200);

export const forecastSchema = z.object({
	datasetId: z.string().uuid(),
	dateColumn: columnName,
	valueColumn: columnName,
	periods: z.number().int().min(1).max(90).default(14),
});

export const anomalySchema = z.object({
	datasetId: z.string().uuid(),
	valueColumn: columnName,
});