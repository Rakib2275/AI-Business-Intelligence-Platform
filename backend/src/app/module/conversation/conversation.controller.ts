import type { Request, Response } from "express";
import httpStatus from "http-status";
import { AppError } from "../../utils/appError";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { getAuditRequestContext } from "../audit/audit.service";
import { conversationService } from "./conversation.service";
import {
	askConversationSchema,
	conversationIdSchema,
	createConversationSchema,
	createMessageSchema,
	messageIdSchema,
	paginationSchema,
	updateConversationSchema,
} from "./conversation.validation";

const getUserId = (req: Request) => {
	if (!req.user?.userId)
		throw new AppError("Authentication required.", httpStatus.UNAUTHORIZED);
	return req.user.userId;
};

const getPagination = (result: {
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
	const body = createConversationSchema.parse(req.body);
	const result = await conversationService.create(
		getUserId(req),
		body.title,
		getAuditRequestContext(req),
	);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Conversation created successfully.",
		data: result,
	});
});

const list = catchAsync(async (req: Request, res: Response) => {
	const { page, limit } = paginationSchema.parse(req.query);
	const result = await conversationService.list(getUserId(req), page, limit);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Conversations retrieved successfully.",
		data: result.items,
		meta: getPagination(result),
	});
});

const get = catchAsync(async (req: Request, res: Response) => {
	const { id } = conversationIdSchema.parse(req.params);
	const result = await conversationService.get(getUserId(req), id);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Conversation retrieved successfully.",
		data: result,
	});
});

const update = catchAsync(async (req: Request, res: Response) => {
	const { id } = conversationIdSchema.parse(req.params);
	const body = updateConversationSchema.parse(req.body);
	const result = await conversationService.update(
		getUserId(req),
		id,
		body,
		getAuditRequestContext(req),
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Conversation updated successfully.",
		data: result,
	});
});

const remove = catchAsync(async (req: Request, res: Response) => {
	const { id } = conversationIdSchema.parse(req.params);
	await conversationService.remove(
		getUserId(req),
		id,
		getAuditRequestContext(req),
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Conversation deleted successfully.",
		data: null,
	});
});

const listMessages = catchAsync(async (req: Request, res: Response) => {
	const { id } = conversationIdSchema.parse(req.params);
	const { page, limit } = paginationSchema.parse(req.query);
	const result = await conversationService.listMessages(
		getUserId(req),
		id,
		page,
		limit,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Conversation messages retrieved successfully.",
		data: result.items,
		meta: getPagination(result),
	});
});

const createMessage = catchAsync(async (req: Request, res: Response) => {
	const { id } = conversationIdSchema.parse(req.params);
	const { content } = createMessageSchema.parse(req.body);
	const result = await conversationService.createMessage(
		getUserId(req),
		id,
		content,
		getAuditRequestContext(req),
	);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Message created successfully.",
		data: result,
	});
});

const deleteMessage = catchAsync(async (req: Request, res: Response) => {
	const { id } = conversationIdSchema.parse(req.params);
	const { messageId } = messageIdSchema.parse(req.params);
	await conversationService.deleteMessage(
		getUserId(req),
		id,
		messageId,
		getAuditRequestContext(req),
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Message deleted successfully.",
		data: null,
	});
});

const ask = catchAsync(async (req: Request, res: Response) => {
	const { id } = conversationIdSchema.parse(req.params);
	const { datasetId, question } = askConversationSchema.parse(req.body);
	const result = await conversationService.ask(
		getUserId(req),
		id,
		datasetId,
		question,
		getAuditRequestContext(req),
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Question answered successfully.",
		data: result,
	});
});

export const conversationController = {
	create,
	list,
	get,
	update,
	remove,
	listMessages,
	createMessage,
	deleteMessage,
	ask,
};
