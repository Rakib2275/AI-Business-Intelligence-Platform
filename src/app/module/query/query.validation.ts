import { z } from "zod";

export const runQuerySchema = z.object({
	datasetId: z.string().uuid(),
	question: z.string().trim().min(3).max(1000),
	conversationId: z.string().uuid().optional(),
});