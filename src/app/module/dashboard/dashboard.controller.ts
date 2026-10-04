import type { Request, Response } from "express";
import httpStatus from "http-status";
import { AppError } from "../../utils/appError";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { getAuditRequestContext } from "../audit/audit.service";
import { dashboardService } from "./dashboard.service";
import {
	createDashboardSchema,
	createWidgetSchema,
	dashboardIdSchema,
	dashboardPaginationSchema,
	reorderWidgetsSchema,
	updateDashboardSchema,
	updateWidgetSchema,
	widgetParamsSchema,
} from "./dashboard.validation";

const getUserId = (req: Request) => {
	if (!req.user?.userId)
		throw new AppError("Authentication required.", httpStatus.UNAUTHORIZED);
	return req.user.userId;
};

const pageMeta = (result: {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}) => ({
	page: result.page,
	limit: result.limit,
	total: result.total,
	totalPages: result.totalPages,
});

const create = catchAsync(async (req: Request, res: Response) => {
	const payload = createDashboardSchema.parse(req.body);
	const result = await dashboardService.create(
		getUserId(req),
		payload,
		getAuditRequestContext(req),
	);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Dashboard created successfully.",
		data: result,
	});
});

const list = catchAsync(async (req: Request, res: Response) => {
	const { page, limit } = dashboardPaginationSchema.parse(req.query);
	const result = await dashboardService.list(getUserId(req), page, limit);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Dashboards retrieved successfully.",
		data: result.items,
		meta: pageMeta(result),
	});
});

const get = catchAsync(async (req: Request, res: Response) => {
	const { id } = dashboardIdSchema.parse(req.params);
	const result = await dashboardService.get(getUserId(req), id);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Dashboard retrieved successfully.",
		data: result,
	});
});

const update = catchAsync(async (req: Request, res: Response) => {
	const { id } = dashboardIdSchema.parse(req.params);
	const payload = updateDashboardSchema.parse(req.body);
	const result = await dashboardService.update(
		getUserId(req),
		id,
		payload,
		getAuditRequestContext(req),
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Dashboard updated successfully.",
		data: result,
	});
});

const remove = catchAsync(async (req: Request, res: Response) => {
	const { id } = dashboardIdSchema.parse(req.params);
	await dashboardService.remove(
		getUserId(req),
		id,
		getAuditRequestContext(req),
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Dashboard deleted successfully.",
		data: null,
	});
});

const listWidgets = catchAsync(async (req: Request, res: Response) => {
	const { id } = dashboardIdSchema.parse(req.params);
	const result = await dashboardService.listWidgets(getUserId(req), id);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Dashboard widgets retrieved successfully.",
		data: result,
	});
});

const createWidget = catchAsync(async (req: Request, res: Response) => {
	const { id } = dashboardIdSchema.parse(req.params);
	const payload = createWidgetSchema.parse(req.body);
	const result = await dashboardService.createWidget(
		getUserId(req),
		id,
		payload,
		getAuditRequestContext(req),
	);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Dashboard widget created successfully.",
		data: result,
	});
});

const updateWidget = catchAsync(async (req: Request, res: Response) => {
	const { id, widgetId } = widgetParamsSchema.parse(req.params);
	const payload = updateWidgetSchema.parse(req.body);
	const result = await dashboardService.updateWidget(
		getUserId(req),
		id,
		widgetId,
		payload,
		getAuditRequestContext(req),
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Dashboard widget updated successfully.",
		data: result,
	});
});

const removeWidget = catchAsync(async (req: Request, res: Response) => {
	const { id, widgetId } = widgetParamsSchema.parse(req.params);
	await dashboardService.removeWidget(
		getUserId(req),
		id,
		widgetId,
		getAuditRequestContext(req),
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Dashboard widget deleted successfully.",
		data: null,
	});
});

const reorderWidgets = catchAsync(async (req: Request, res: Response) => {
	const { id } = dashboardIdSchema.parse(req.params);
	const { widgets } = reorderWidgetsSchema.parse(req.body);
	const result = await dashboardService.reorderWidgets(
		getUserId(req),
		id,
		widgets,
		getAuditRequestContext(req),
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Dashboard widgets reordered successfully.",
		data: result,
	});
});

const refreshWidget = catchAsync(async (req: Request, res: Response) => {
	const { id, widgetId } = widgetParamsSchema.parse(req.params);
	const result = await dashboardService.refreshWidget(
		getUserId(req),
		id,
		widgetId,
		getAuditRequestContext(req),
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Dashboard widget data refreshed successfully.",
		data: result,
	});
});

export const dashboardController = {
	create,
	list,
	get,
	update,
	remove,
	listWidgets,
	createWidget,
	updateWidget,
	removeWidget,
	reorderWidgets,
	refreshWidget,
};
