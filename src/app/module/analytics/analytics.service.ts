import { prisma } from "../../lib/prisma";
import { calculateForecast, findAnomalies, type DataRow } from "./analytics.math";

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
) => {
	const rows = await getDatasetRows(userId, datasetId);
	const result = calculateForecast(rows, dateColumn, valueColumn, periods);
	await prisma.auditLog.create({
		data: {
			userId,
			action: "FORECAST_GENERATED",
			resource: "BusinessData",
			resourceId: datasetId,
			metadata: { dateColumn, valueColumn, periods },
		},
	});
	return result;
};

const detectAnomalies = async (userId: string, datasetId: string, valueColumn: string) => {
	const rows = await getDatasetRows(userId, datasetId);
	const result = findAnomalies(rows, valueColumn);
	await prisma.auditLog.create({
		data: {
			userId,
			action: "ANOMALIES_DETECTED",
			resource: "BusinessData",
			resourceId: datasetId,
			metadata: { valueColumn, anomalyCount: result.anomalies.length },
		},
	});
	return result;
};

export const analyticsService = { forecast, detectAnomalies };