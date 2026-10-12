import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { analyticsService } from "./analytics.service.js";
import { getAuditRequestContext } from "../audit/audit.service.js";

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
		req.body.valueColumn,
		getAuditRequestContext(req),
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Anomaly detection completed successfully.",
		data: result,
	});
});

export const analyticsController = { forecast, detectAnomalies };