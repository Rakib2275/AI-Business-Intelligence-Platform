import {
	ConversationStatus,
	MessageRole,
	MessageType,
} from "../../../generated/prisma/enums";
import { AppError } from "../../utils/appError";
import type { AuditRequestContext } from "../audit/audit.service";
import { auditService } from "../audit/audit.service";
import { prisma } from "../../lib/prisma";
import { queryService } from "../query/query.service";

const ensureOwnedConversation = async (userId: string, id: string) => {
	const conversation = await prisma.conversation.findFirst({
		where: { id, userId },
	});
	if (!conversation) throw new AppError("Conversation not found.", 404);
	return conversation;
};

const create = async (
	userId: string,
	title: string | undefined,
	context: AuditRequestContext,
) => {
	const conversation = await prisma.conversation.create({
		data: { userId, title: title ?? "New conversation" },
	});
	await auditService.log({
		userId,
		action: "CONVERSATION_CREATED",
		category: "CONVERSATION",
		resourceType: "Conversation",
		resourceId: conversation.id,
		description: "Conversation created.",
		...context,
	});
	return conversation;
};

const list = async (userId: string, page: number, limit: number) => {
	const where = { userId };
	const [items, total] = await prisma.$transaction([
		prisma.conversation.findMany({
			where,
			include: { _count: { select: { messages: true } } },
			orderBy: { updatedAt: "desc" },
			skip: (page - 1) * limit,
			take: limit,
		}),
		prisma.conversation.count({ where }),
	]);
	return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
};

const get = async (userId: string, id: string) => {
	const conversation = await prisma.conversation.findFirst({
		where: { id, userId },
		include: {
			messages: { orderBy: { createdAt: "desc" }, take: 20 },
			_count: { select: { messages: true } },
		},
	});
	if (!conversation) throw new AppError("Conversation not found.", 404);
	return { ...conversation, messages: conversation.messages.reverse() };
};

const update = async (
	userId: string,
	id: string,
	payload: { title?: string; status?: "ACTIVE" | "ARCHIVED" },
	context: AuditRequestContext,
) => {
	await ensureOwnedConversation(userId, id);
	const updated = await prisma.conversation.update({
		where: { id },
		data: {
			...(payload.title !== undefined ? { title: payload.title } : {}),
			...(payload.status !== undefined
				? { status: payload.status as ConversationStatus }
				: {}),
		},
	});
	await auditService.log({
		userId,
		action: "CONVERSATION_UPDATED",
		category: "CONVERSATION",
		resourceType: "Conversation",
		resourceId: id,
		description: "Conversation updated.",
		metadata: { changedFields: Object.keys(payload) },
		...context,
	});
	return updated;
};

const remove = async (
	userId: string,
	id: string,
	context: AuditRequestContext,
) => {
	await ensureOwnedConversation(userId, id);
	await prisma.conversation.delete({ where: { id } });
	await auditService.log({
		userId,
		action: "CONVERSATION_DELETED",
		category: "CONVERSATION",
		resourceType: "Conversation",
		resourceId: id,
		description: "Conversation deleted.",
		...context,
	});
};

const listMessages = async (
	userId: string,
	id: string,
	page: number,
	limit: number,
) => {
	await ensureOwnedConversation(userId, id);
	const where = { conversationId: id };
	const [items, total] = await prisma.$transaction([
		prisma.message.findMany({
			where,
			orderBy: [{ createdAt: "asc" }, { id: "asc" }],
			skip: (page - 1) * limit,
			take: limit,
		}),
		prisma.message.count({ where }),
	]);
	return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
};

const createMessage = async (
	userId: string,
	id: string,
	content: string,
	context: AuditRequestContext,
) => {
	const conversation = await ensureOwnedConversation(userId, id);
	if (conversation.status !== ConversationStatus.ACTIVE) {
		throw new AppError(
			"Archived conversations cannot receive new messages.",
			409,
		);
	}
	const message = await prisma.message.create({
		data: {
			conversationId: id,
			role: MessageRole.USER,
			messageType: MessageType.TEXT,
			content,
		},
	});
	await prisma.conversation.update({
		where: { id },
		data: { updatedAt: new Date() },
	});
	await auditService.log({
		userId,
		action: "MESSAGE_CREATED",
		category: "CONVERSATION",
		resourceType: "Message",
		resourceId: message.id,
		description: "Conversation message created.",
		metadata: { conversationId: id, messageType: "TEXT" },
		...context,
	});
	return message;
};

const deleteMessage = async (
	userId: string,
	id: string,
	messageId: string,
	context: AuditRequestContext,
) => {
	await ensureOwnedConversation(userId, id);
	const message = await prisma.message.findFirst({
		where: { id: messageId, conversationId: id },
		select: { id: true },
	});
	if (!message) throw new AppError("Message not found.", 404);
	await prisma.message.delete({ where: { id: messageId } });
	await auditService.log({
		userId,
		action: "MESSAGE_DELETED",
		category: "CONVERSATION",
		resourceType: "Message",
		resourceId: messageId,
		description: "Conversation message deleted.",
		metadata: { conversationId: id },
		...context,
	});
};

const ask = async (
	userId: string,
	id: string,
	datasetId: string,
	question: string,
	context: AuditRequestContext,
) => {
	const conversation = await ensureOwnedConversation(userId, id);
	if (conversation.status !== ConversationStatus.ACTIVE) {
		throw new AppError(
			"Archived conversations cannot receive new questions.",
			409,
		);
	}
	return queryService.runQuery(userId, datasetId, question, id, context);
};

export const conversationService = {
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
