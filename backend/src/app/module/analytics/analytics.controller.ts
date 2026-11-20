import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { getAuditRequestContext } from "../audit/audit.service.js";
import { analyticsService } from "./analytics.service.js";

const trainForecast = catchAsync(async (req: Request, res: Response) => {
	const userId = req.user?.userId;
	if (!userId) throw new Error("Unauthorized.");
	const result = await analyticsService.trainForecast(
		userId,
		req.body.datasetId,
		req.body.dateColumn,
		req.body.valueColumn,
		getAuditRequestContext(req),
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Forecast model trained successfully.",
		data: result,
	});
});

const forecast = catchAsync(async (req: Request, res: Response) => {
	const userId = req.user?.userId;
	if (!userId) throw new Error("Unauthorized.");
	const result = await analyticsService.forecast(
		userId,
		req.body.datasetId,
		req.body.dateColumn,
		req.body.valueColumn,
		req.body.periods,
		getAuditRequestContext(req),
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Forecast generated successfully.",
		data: result,
	});
});

const detectAnomalies = catchAsync(async (req: Request, res: Response) => {
	const userId = req.user?.userId;
	if (!userId) throw new Error("Unauthorized.");
	const result = await analyticsService.detectAnomalies(
		userId,
		req.body.datasetId,
		req.body.featureColumns,
		getAuditRequestContext(req),
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Anomaly detection completed successfully.",
		data: result,
	});
});

const trainAnomalies = catchAsync(async (req: Request, res: Response) => {
	const userId = req.user?.userId;
	if (!userId) throw new Error("Unauthorized.");
	const result = await analyticsService.trainAnomalies(
		userId,
		req.body.datasetId,
		req.body.featureColumns,
		getAuditRequestContext(req),
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Anomaly model trained successfully.",
		data: result,
	});
});

export const analyticsController = {
	trainForecast,
	forecast,
	detectAnomalies,
	trainAnomalies,
};
