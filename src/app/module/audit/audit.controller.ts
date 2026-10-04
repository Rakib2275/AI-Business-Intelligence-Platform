import type { Request, Response } from "express";
import httpStatus from "http-status";
import type { Prisma } from "../../../generated/prisma/client";
import { AppError } from "../../utils/appError";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { auditService } from "./audit.service";
import {
	auditIdSchema,
	auditQuerySchema,
	auditResourceSchema,
	auditUserIdSchema,
} from "./audit.validation";

const getLogs = catchAsync(async (req: Request, res: Response) => {
	const filters = auditQuerySchema.parse(req.query);
	const { page, limit, from, to, search, ...exactFilters } = filters;
	const where: Prisma.AuditLogWhereInput = {
		...exactFilters,
		createdAt: from || to ? { gte: from, lte: to } : undefined,
		...(search
			? {
					OR: [
						{ action: { contains: search, mode: "insensitive" } },
						{ resource: { contains: search, mode: "insensitive" } },
						{ resourceType: { contains: search, mode: "insensitive" } },
						{ resourceId: { contains: search, mode: "insensitive" } },
						{ description: { contains: search, mode: "insensitive" } },
					],
				}
			: {}),
	};
	const result = await auditService.list(where, page, limit);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Audit logs retrieved successfully.",
		data: result.items,
		meta: {
			page: result.page,
			limit: result.limit,
			total: result.total,
			totalPages: result.totalPages,
		},
	});
});

const getLogById = catchAsync(async (req: Request, res: Response) => {
	const { id } = auditIdSchema.parse(req.params);
	const result = await auditService.getById(id);
	if (!result) throw new AppError("Audit log not found.", httpStatus.NOT_FOUND);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Audit log retrieved successfully.",
		data: result,
	});
});

const getLogsByUser = catchAsync(async (req: Request, res: Response) => {
	const { userId } = auditUserIdSchema.parse(req.params);
	const filters = auditQuerySchema.parse({ ...req.query, userId });
	const { page, limit, from, to, search, ...exactFilters } = filters;
	const where: Prisma.AuditLogWhereInput = {
		...exactFilters,
		createdAt: from || to ? { gte: from, lte: to } : undefined,
		...(search
			? {
					OR: [
						{ action: { contains: search, mode: "insensitive" } },
						{ resourceType: { contains: search, mode: "insensitive" } },
						{ resourceId: { contains: search, mode: "insensitive" } },
						{ description: { contains: search, mode: "insensitive" } },
					],
				}
			: {}),
	};
	const result = await auditService.list(where, page, limit);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "User audit logs retrieved successfully.",
		data: result.items,
		meta: {
			page: result.page,
			limit: result.limit,
			total: result.total,
			totalPages: result.totalPages,
		},
	});
});

const getLogsByResource = catchAsync(async (req: Request, res: Response) => {
	const { resourceType, resourceId } = auditResourceSchema.parse(req.params);
	const filters = auditQuerySchema.parse(req.query);
	const { page, limit, from, to, search, ...exactFilters } = filters;
	const result = await auditService.list(
		{
			...exactFilters,
			resourceType,
			resourceId,
			createdAt: from || to ? { gte: from, lte: to } : undefined,
			...(search
				? {
						OR: [
							{ action: { contains: search, mode: "insensitive" } },
							{ description: { contains: search, mode: "insensitive" } },
						],
					}
				: {}),
		},
		page,
		limit,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Resource audit logs retrieved successfully.",
		data: result.items,
		meta: {
			page: result.page,
			limit: result.limit,
			total: result.total,
			totalPages: result.totalPages,
		},
	});
});

export const auditController = {
	getLogs,
	getLogById,
	getLogsByUser,
	getLogsByResource,
};
