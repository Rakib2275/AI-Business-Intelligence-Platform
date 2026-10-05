import { z } from "zod";

export const createProductSchema = z.object({
	name: z.string().trim().min(1, "Product name is required").max(150),
	title: z.string().trim().min(1, "Product title is required").max(180),
	description: z
		.string()
		.trim()
		.min(1, "Product description is required")
		.max(5000),
	brand: z.string().trim().min(1, "Product brand is required").max(120),
	location: z.string().trim().min(1, "Product location is required").max(180),
	price: z.coerce.number().finite().min(0).max(9999999999.99),
});
