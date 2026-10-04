import { z } from "zod";

export const conversationIdSchema = z.object({ id: z.uuid() });
export const messageIdSchema = z.object({ messageId: z.uuid() });
export const paginationSchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const createConversationSchema = z.object({
	title: z.string().trim().min(1).max(120).optional(),
});

export const updateConversationSchema = z
	.object({
		title: z.string().trim().min(1).max(120).optional(),
		status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
	})
	.refine((value) => value.title !== undefined || value.status !== undefined, {
		message: "At least one conversation field must be provided.",
	});

export const createMessageSchema = z.object({
	content: z.string().trim().min(1).max(10_000),
});

export const askConversationSchema = z.object({
	datasetId: z.uuid(),
	question: z.string().trim().min(3).max(1000),
});
