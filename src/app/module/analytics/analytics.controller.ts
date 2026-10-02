import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { analyticsService } from "./analytics.service";

const forecast = catchAsync(async (req: Request, res: Response) => {
	const userId = req.user?.userId;
	if (!userId) throw new Error("Unauthorized.");
	const result = await analyticsService.forecast(
		userId,
		req.body.datasetId,
		req.body.dateColumn,
		req.body.valueColumn,
		req.body.periods,
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
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Anomaly detection completed successfully.",
		data: result,
	});
});

export const analyticsController = { forecast, detectAnomalies };