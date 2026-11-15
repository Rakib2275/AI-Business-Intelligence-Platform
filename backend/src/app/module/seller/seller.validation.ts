import { z } from "zod";

const usernameSchema = z
	.string()
	.trim()
	.toLowerCase()
	.min(3)
	.max(30)
	.regex(
		/^[a-z0-9._-]+$/,
		"Username may contain letters, numbers, dots, underscores, and hyphens.",
	);

const passwordSchema = z
	.string()
	.min(8)
	.max(20)
	.regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
	.regex(/[a-z]/, "Password must contain at least one lowercase letter.")
	.regex(/[0-9]/, "Password must contain at least one number.")
	.regex(/[!@#$%^&*]/, "Password must contain at least one special character.");

const businessProfileSchema = z.record(z.string(), z.unknown());

export const createSellerSchema = z.object({
	name: z.string().trim().min(2).max(80),
	username: usernameSchema,
	initialPassword: passwordSchema,
	email: z.email().transform((email) => email.trim().toLowerCase()),
	contactNumber: z.string().trim().max(30).optional(),
	businessProfile: businessProfileSchema.optional(),
});

export const updateSellerSchema = z
	.object({
		name: z.string().trim().min(2).max(80).optional(),
		username: usernameSchema.optional(),
		email: z
			.email()
			.transform((email) => email.trim().toLowerCase())
			.optional(),
		contactNumber: z.string().trim().max(30).optional(),
		businessProfile: businessProfileSchema.optional(),
		status: z.enum(["ACTIVE", "BLOCKED"]).optional(),
	})
	.refine((payload) => Object.keys(payload).length > 0, {
		message: "At least one seller field must be provided.",
	});

export const updateSellerProfileSchema = z
	.object({
		name: z.string().trim().min(2).max(80).optional(),
		username: usernameSchema.optional(),
		email: z
			.email()
			.transform((email) => email.trim().toLowerCase())
			.optional(),
		contactNumber: z.string().trim().max(30).optional(),
		businessProfile: businessProfileSchema.optional(),
	})
	.refine((payload) => Object.keys(payload).length > 0, {
		message: "At least one profile field must be provided.",
	});

export const verifySellerEmailSchema = z.object({
	email: z.email().transform((email) => email.trim().toLowerCase()),
	otp: z.string().length(6),
});

export const changeSellerPasswordSchema = z.object({
	currentPassword: z.string().min(1),
	newPassword: passwordSchema,
});
