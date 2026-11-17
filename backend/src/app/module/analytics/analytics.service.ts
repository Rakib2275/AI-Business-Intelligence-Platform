import { prisma } from "../../lib/prisma.js";
import { findAnomalies, type DataRow } from "./analytics.math.js";
import type { AuditRequestContext } from "../audit/audit.service.js";
import { auditService } from "../audit/audit.service.js";
import config from "../../config/index.js";
import { AppError } from "../../utils/appError.js";

type ForecastPoint = {
	date: string;
	value: number;
};

type ForecastResult = {
	observations: ForecastPoint[];
	forecast: ForecastPoint[];
	trendPerPeriod: number;
	method: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const isForecastPoint = (value: unknown): value is ForecastPoint =>
	isRecord(value) &&
	typeof value.date === "string" &&
	Number.isFinite(Date.parse(value.date)) &&
	typeof value.value === "number" &&
	Number.isFinite(value.value);

const isForecastResult = (value: unknown): value is ForecastResult =>
	isRecord(value) &&
	Array.isArray(value.observations) &&
	value.observations.length >= 3 &&
	value.observations.every(isForecastPoint) &&
	Array.isArray(value.forecast) &&
	value.forecast.every(isForecastPoint) &&
	typeof value.trendPerPeriod === "number" &&
	Number.isFinite(value.trendPerPeriod) &&
	typeof value.method === "string";

const getDatasetRows = async (
	userId: string,
	datasetId: string,
): Promise<DataRow[]> => {
	const dataset = await prisma.businessData.findFirst({
		where: { id: datasetId, userId },
		select: { id: true, data: true },
	});
	if (!dataset) throw new Error("Dataset not found.");
	if (!Array.isArray(dataset.data))
		throw new Error("Dataset rows are not available.");
	return dataset.data.flatMap((row) =>
		row && typeof row === "object" && !Array.isArray(row)
			? [row as unknown as DataRow]
			: [],
	);
};

const getDailyForecastRows = (
	rows: DataRow[],
	dateColumn: string,
	valueColumn: string,
) => {
	const totals = new Map<string, number>();
	for (const row of rows) {
		const rawDate = row[dateColumn];
		const rawValue = row[valueColumn];
		if (
			(typeof rawDate !== "string" && !(rawDate instanceof Date)) ||
			(typeof rawValue !== "number" && typeof rawValue !== "string")
		) {
			continue;
		}
		const date = new Date(String(rawDate));
		const value =
			typeof rawValue === "number"
				? rawValue
				: Number(rawValue.replaceAll(",", "").trim());
		if (Number.isNaN(date.getTime()) || !Number.isFinite(value)) continue;
		const day = date.toISOString().slice(0, 10);
		totals.set(day, (totals.get(day) ?? 0) + value);
	}
	return [...totals.entries()]
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([date, value]) => ({ date, value }));
};

const callForecastService = async (
	rows: Array<{ date: string; value: number }>,
	periods: number,
): Promise<ForecastResult> => {
	if (!config.ai_service_api_key) {
		throw new AppError("AI service is not configured.", 503);
	}

	let response: Response;
	try {
		response = await fetch(
			`${config.ai_service_url.replace(/\/$/, "")}/api/v1/forecasting/forecast`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-api-key": config.ai_service_api_key,
				},
				signal: AbortSignal.timeout(30_000),
				body: JSON.stringify({
					rows,
					date_column: "date",
					value_column: "value",
					periods,
				}),
			},
		);
	} catch {
		throw new AppError("Forecasting service is unavailable.", 502);
	}

	if (!response.ok) {
		if (response.status === 422) {
			throw new AppError(
				"At least three valid historical periods are required for forecasting.",
				422,
			);
		}
		throw new AppError(
			"Forecasting service could not generate a forecast.",
			502,
		);
	}

	let result: unknown;
	try {
		result = await response.json();
	} catch {
		throw new AppError(
			"Forecasting service returned an invalid response.",
			502,
		);
	}
	if (!isForecastResult(result) || result.forecast.length !== periods) {
		throw new AppError(
			"Forecasting service returned an invalid response.",
			502,
		);
	}
	return result;
};

const forecast = async (
	userId: string,
	datasetId: string,
	dateColumn: string,
	valueColumn: string,
	periods: number,
	context: AuditRequestContext = {},
) => {
	const rows = await getDatasetRows(userId, datasetId);
	const dailyRows = getDailyForecastRows(rows, dateColumn, valueColumn);
	if (dailyRows.length < 3) {
		throw new AppError(
			"At least three valid date/value rows are required for forecasting.",
			422,
		);
	}
	const result = await callForecastService(dailyRows, periods);
	await auditService.log({
		userId,
		action: "FORECAST_GENERATED",
		category: "AI",
		resourceType: "BusinessData",
		resourceId: datasetId,
		description: "Business data forecast generated.",
		metadata: { dateColumn, valueColumn, periods },
		...context,
	});
	return result;
};

const detectAnomalies = async (
	userId: string,
	datasetId: string,
	valueColumn: string,
	context: AuditRequestContext = {},
) => {
	const rows = await getDatasetRows(userId, datasetId);
	const result = findAnomalies(rows, valueColumn);
	await auditService.log({
		userId,
		action: "ANOMALIES_DETECTED",
		category: "AI",
		resourceType: "BusinessData",
		resourceId: datasetId,
		description: "Business data anomaly detection completed.",
		metadata: { valueColumn, anomalyCount: result.anomalies.length },
		...context,
	});
	return result;
};

export const analyticsService = { forecast, detectAnomalies };
