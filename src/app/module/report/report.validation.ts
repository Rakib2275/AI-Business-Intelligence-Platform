import { z } from "zod";

export const createReportSchema = z.object({
	title: z.string().trim().min(3).max(120),
	queryIds: z.array(z.uuid()).max(50).optional(),
});