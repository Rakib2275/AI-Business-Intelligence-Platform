import config from "../../config/index.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/appError.js";
import type { AuditRequestContext } from "../audit/audit.service.js";
import { auditService } from "../audit/audit.service.js";
import type { DataRow } from "./analytics.math.js";

type ForecastPoint = {
	date: string;
	value: number;
};

type ForecastResult = {
	observations: ForecastPoint[];
	forecast: ForecastPoint[];
	trendPerPeriod: number;
	method: string;
	modelVersion: string;
	trainedAt: string;
	metrics: ForecastMetrics;
};

type ForecastMetrics = {
	mae: number;
	rmse: number;
	training_periods: number;
	validation_periods: number;
};

type ForecastTrainingResult = {
	datasetId: string;
	modelVersion: string;
	frequency: string;
	trainedAt: string;
	metrics: ForecastMetrics;
};

type AnomalyMetrics = {
	training_rows: number;
	flagged_training_rows: number;
	feature_count: number;
	contamination: number;
};

type AnomalyTrainingResult = {
	datasetId: string;
	modelVersion: string;
	featureColumns: string[];
	trainedAt: string;
	metrics: AnomalyMetrics;
};

type AnomalyCandidate = {
	rowIndex: number;
	score: number;
	values: Record<string, number>;
};

type AnomalyResult = {
	totalRows: number;
	scoredRows: number;
	anomalyCount: number;
	truncated: boolean;
	anomalies: AnomalyCandidate[];
	modelVersion: string;
	trainedAt: string;
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
	value.observations.length >= 1 &&
	value.observations.every(isForecastPoint) &&
	Array.isArray(value.forecast) &&
	value.forecast.every(isForecastPoint) &&
	typeof value.trendPerPeriod === "number" &&
	Number.isFinite(value.trendPerPeriod) &&
	typeof value.method === "string" &&
	typeof value.modelVersion === "string" &&
	typeof value.trainedAt === "string" &&
	isForecastMetrics(value.metrics);

const isForecastMetrics = (value: unknown): value is ForecastMetrics =>
	isRecord(value) &&
	typeof value.mae === "number" &&
	Number.isFinite(value.mae) &&
	typeof value.rmse === "number" &&
	Number.isFinite(value.rmse) &&
	typeof value.training_periods === "number" &&
	Number.isInteger(value.training_periods) &&
	typeof value.validation_periods === "number" &&
	Number.isInteger(value.validation_periods);

const isForecastTrainingResult = (
	value: unknown,
): value is ForecastTrainingResult =>
	isRecord(value) &&
	typeof value.datasetId === "string" &&
	typeof value.modelVersion === "string" &&
	typeof value.frequency === "string" &&
	typeof value.trainedAt === "string" &&
	isForecastMetrics(value.metrics);

const isAnomalyMetrics = (value: unknown): value is AnomalyMetrics =>
	isRecord(value) &&
	typeof value.training_rows === "number" &&
	Number.isInteger(value.training_rows) &&
	typeof value.flagged_training_rows === "number" &&
	Number.isInteger(value.flagged_training_rows) &&
	typeof value.feature_count === "number" &&
	Number.isInteger(value.feature_count) &&
	typeof value.contamination === "number" &&
	Number.isFinite(value.contamination);

const isAnomalyTrainingResult = (
	value: unknown,
): value is AnomalyTrainingResult =>
	isRecord(value) &&
	typeof value.datasetId === "string" &&
	Array.isArray(value.featureColumns) &&
	value.featureColumns.every((column) => typeof column === "string") &&
	typeof value.modelVersion === "string" &&
	typeof value.trainedAt === "string" &&
	isAnomalyMetrics(value.metrics);

const isAnomalyCandidate = (value: unknown): value is AnomalyCandidate => {
	if (!isRecord(value) || !isRecord(value.values)) return false;
	return (
		typeof value.rowIndex === "number" &&
		Number.isInteger(value.rowIndex) &&
		typeof value.score === "number" &&
		Number.isFinite(value.score) &&
		Object.values(value.values).every(
			(item) =>
				item === null || (typeof item === "number" && Number.isFinite(item)),
		)
	);
};

const isAnomalyResult = (value: unknown): value is AnomalyResult =>
	isRecord(value) &&
	typeof value.totalRows === "number" &&
	Number.isInteger(value.totalRows) &&
	typeof value.scoredRows === "number" &&
	Number.isInteger(value.scoredRows) &&
	typeof value.anomalyCount === "number" &&
	Number.isInteger(value.anomalyCount) &&
	typeof value.truncated === "boolean" &&
	Array.isArray(value.anomalies) &&
	value.anomalies.every(isAnomalyCandidate) &&
	typeof value.modelVersion === "string" &&
	typeof value.trainedAt === "string";

const getDatasetRows = async (
	userId: string,
	datasetId: string,
): Promise<{ rows: DataRow[]; updatedAt: Date }> => {
	const dataset = await prisma.businessData.findFirst({
		where: { id: datasetId, userId },
		select: { id: true, data: true, updatedAt: true },
	});
	if (!dataset) throw new AppError("Dataset not found.", 404);
	if (!Array.isArray(dataset.data))
		throw new AppError("Dataset rows are not available.", 409);
	return {
		rows: dataset.data.flatMap((row) =>
			row && typeof row === "object" && !Array.isArray(row)
				? [row as unknown as DataRow]
				: [],
		),
		updatedAt: dataset.updatedAt,
	};
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

const callAiService = async (
	path:
		| "forecasting/train"
		| "forecasting/predict"
		| "anomalies/train"
		| "anomalies/detect",
	payload: Record<string, unknown>,
): Promise<unknown> => {
	if (!config.ai_service_api_key) {
		throw new AppError("AI service is not configured.", 503);
	}

	let response: Response;
	try {
		response = await fetch(
			`${config.ai_service_url.replace(/\/$/, "")}/api/v1/${path}`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-api-key": config.ai_service_api_key,
				},
				signal: AbortSignal.timeout(60_000),
				body: JSON.stringify(payload),
			},
		);
	} catch {
		throw new AppError("AI analysis service is unavailable.", 502);
	}

	if (!response.ok) {
		if (response.status === 409) {
			throw new AppError(
				"No current model is available. Train or retrain it first.",
				409,
			);
		}
		if (response.status === 422) {
			throw new AppError(
				"Analysis input is invalid or does not contain enough valid data.",
				422,
			);
		}
		throw new AppError(
			"AI analysis service could not complete the request.",
			response.status === 503 ? 503 : 502,
		);
	}

	let result: unknown;
	try {
		result = await response.json();
	} catch {
		throw new AppError(
			"AI analysis service returned an invalid response.",
			502,
		);
	}
	return result;
};

const trainForecast = async (
	userId: string,
	datasetId: string,
	dateColumn: string,
	valueColumn: string,
	context: AuditRequestContext = {},
) => {
	const dataset = await getDatasetRows(userId, datasetId);
	const dailyRows = getDailyForecastRows(dataset.rows, dateColumn, valueColumn);
	if (dailyRows.length < 5) {
		throw new AppError(
			"At least five valid daily rows are required to train a forecast model.",
			422,
		);
	}
	const result = await callAiService("forecasting/train", {
		dataset_id: datasetId,
		rows: dailyRows,
		date_column: "date",
		value_column: "value",
		data_version: dataset.updatedAt.toISOString(),
	});
	if (!isForecastTrainingResult(result) || result.datasetId !== datasetId) {
		throw new AppError(
			"Forecasting service returned an invalid training result.",
			502,
		);
	}
	await auditService.log({
		userId,
		action: "FORECAST_MODEL_TRAINED",
		category: "AI",
		resourceType: "BusinessData",
		resourceId: datasetId,
		description: "Forecast model trained and stored.",
		metadata: {
			dateColumn,
			valueColumn,
			modelVersion: result.modelVersion,
			metrics: result.metrics,
		},
		...context,
	});
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
	const dataset = await getDatasetRows(userId, datasetId);
	const dailyRows = getDailyForecastRows(dataset.rows, dateColumn, valueColumn);
	if (dailyRows.length < 3) {
		throw new AppError(
			"At least three valid date/value rows are required for forecasting.",
			422,
		);
	}
	const result = await callAiService("forecasting/predict", {
		dataset_id: datasetId,
		date_column: "date",
		value_column: "value",
		data_version: dataset.updatedAt.toISOString(),
		periods,
	});
	if (!isForecastResult(result) || result.forecast.length !== periods) {
		throw new AppError(
			"Forecasting service returned an invalid response.",
			502,
		);
	}
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
	featureColumns: string[],
	context: AuditRequestContext = {},
) => {
	const dataset = await getDatasetRows(userId, datasetId);
	const rows = dataset.rows.map((row) =>
		Object.fromEntries(featureColumns.map((column) => [column, row[column]])),
	);
	const result = await callAiService("anomalies/detect", {
		dataset_id: datasetId,
		rows,
		feature_columns: featureColumns,
		data_version: dataset.updatedAt.toISOString(),
	});
	if (!isAnomalyResult(result) || result.totalRows !== rows.length) {
		throw new AppError("Anomaly service returned an invalid response.", 502);
	}
	await auditService.log({
		userId,
		action: "ANOMALIES_DETECTED",
		category: "AI",
		resourceType: "BusinessData",
		resourceId: datasetId,
		description: "Business data anomaly detection completed.",
		metadata: { featureColumns, anomalyCount: result.anomalyCount },
		...context,
	});
	return result;
};

const trainAnomalies = async (
	userId: string,
	datasetId: string,
	featureColumns: string[],
	context: AuditRequestContext = {},
) => {
	const dataset = await getDatasetRows(userId, datasetId);
	const rows = dataset.rows.map((row) =>
		Object.fromEntries(featureColumns.map((column) => [column, row[column]])),
	);
	const result = await callAiService("anomalies/train", {
		dataset_id: datasetId,
		rows,
		feature_columns: featureColumns,
		data_version: dataset.updatedAt.toISOString(),
	});
	if (
		!isAnomalyTrainingResult(result) ||
		result.datasetId !== datasetId ||
		result.featureColumns.length !== featureColumns.length ||
		result.featureColumns.some(
			(column, index) => column !== featureColumns[index],
		)
	) {
		throw new AppError(
			"Anomaly service returned an invalid training result.",
			502,
		);
	}
	await auditService.log({
		userId,
		action: "ANOMALY_MODEL_TRAINED",
		category: "AI",
		resourceType: "BusinessData",
		resourceId: datasetId,
		description: "Anomaly model trained and stored.",
		metadata: {
			featureColumns,
			modelVersion: result.modelVersion,
			metrics: result.metrics,
		},
		...context,
	});
	return result;
};

export const analyticsService = {
	trainForecast,
	forecast,
	detectAnomalies,
	trainAnomalies,
};
