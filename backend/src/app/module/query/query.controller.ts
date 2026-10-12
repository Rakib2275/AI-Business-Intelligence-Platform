import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { queryService } from "./query.service.js";
import { getAuditRequestContext } from "../audit/audit.service.js";

const runQuery = catchAsync(async (req: Request, res: Response) => {
	const userId = req.user?.userId;
	if (!userId) throw new Error("Unauthorized.");

	const result = await queryService.runQuery(
		userId,
		req.body.datasetId,
		req.body.question,
		req.body.conversationId,
		getAuditRequestContext(req),
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Query completed successfully.",
		data: result,
	});
});

const getQueryHistory = catchAsync(async (req: Request, res: Response) => {
	const userId = req.user?.userId;
	if (!userId) throw new Error("Unauthorized.");

	const history = await queryService.getQueryHistory(userId);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Query history retrieved successfully.",
		data: history,
	});
});

export const queryController = { runQuery, getQueryHistory };