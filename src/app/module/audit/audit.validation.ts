import { z } from "zod";

export const auditQuerySchema = z
	.object({
		page: z.coerce.number().int().min(1).default(1),
		limit: z.coerce.number().int().min(1).max(100).default(25),
		userId: z.uuid().optional(),
		action: z.string().trim().min(1).max(100).optional(),
		category: z
			.enum([
				"AUTH",
				"USER",
				"DATA",
				"QUERY",
				"AI",
				"CONVERSATION",
				"DASHBOARD",
				"REPORT",
				"SYSTEM",
			])
			.optional(),
		resourceType: z.string().trim().min(1).max(100).optional(),
		resourceId: z.string().trim().min(1).max(100).optional(),
		status: z.enum(["SUCCESS", "FAILURE", "REJECTED"]).optional(),
		from: z.coerce.date().optional(),
		to: z.coerce.date().optional(),
		search: z.string().trim().min(1).max(200).optional(),
	})
	.refine((query) => !query.from || !query.to || query.from <= query.to, {
		message: "'from' must be earlier than or equal to 'to'.",
	});

export const auditIdSchema = z.object({ id: z.uuid() });
export const auditUserIdSchema = z.object({ userId: z.uuid() });
export const auditResourceSchema = z.object({
	resourceType: z.string().trim().min(1).max(100),
	resourceId: z.string().trim().min(1).max(100),
});
