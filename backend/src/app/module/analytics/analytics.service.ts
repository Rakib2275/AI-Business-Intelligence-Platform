import { prisma } from "../../lib/prisma.js";
import { calculateForecast, findAnomalies, type DataRow } from "./analytics.math.js";
import type { AuditRequestContext } from "../audit/audit.service.js";
import { auditService } from "../audit/audit.service.js";

const getDatasetRows = async (userId: string, datasetId: string): Promise<DataRow[]> => {
	const dataset = await prisma.businessData.findFirst({
		where: { id: datasetId, userId },
		select: { id: true, data: true },
	});
	if (!dataset) throw new Error("Dataset not found.");
	if (!Array.isArray(dataset.data)) throw new Error("Dataset rows are not available.");
	return dataset.data.flatMap((row) =>
		row && typeof row === "object" && !Array.isArray(row)
			? [row as unknown as DataRow]
			: [],
	);
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
	const result = calculateForecast(rows, dateColumn, valueColumn, periods);
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