import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import type { z } from "zod";
import type { Prisma } from "../../../generated/prisma/client.js";
import {
	PamentStatus,
	QueryStatus,
	Role,
	UserStatus,
} from "../../../generated/prisma/enums.js";
import config from "../../config/index.js";
import { transporter } from "../../lib/nodeMailer.js";
import { prisma } from "../../lib/prisma.js";
import { redisClient } from "../../lib/redis.js";
import { AppError } from "../../utils/appError.js";
import {
	type AuditRequestContext,
	auditService,
} from "../audit/audit.service.js";
import type {
	changeSellerPasswordSchema,
	createSellerSchema,
	updateSellerProfileSchema,
	updateSellerSchema,
	verifyInitialSellerEmailSchema,
	verifySellerEmailSchema,
} from "./seller.validation.js";

type CreateSellerPayload = z.infer<typeof createSellerSchema>;
type UpdateSellerPayload = z.infer<typeof updateSellerSchema>;
type UpdateSellerProfilePayload = z.infer<typeof updateSellerProfileSchema>;
type ChangeSellerPasswordPayload = z.infer<typeof changeSellerPasswordSchema>;
type VerifyInitialSellerEmailPayload = z.infer<
	typeof verifyInitialSellerEmailSchema
>;
type VerifySellerEmailPayload = z.infer<typeof verifySellerEmailSchema>;

const sellerSelect = {
	id: true,
	name: true,
	username: true,
	email: true,
	contactNumber: true,
	businessProfile: true,
	imageUrl: true,
	role: true,
	status: true,
	passwordChangeRequired: true,
	createdAt: true,
	updatedAt: true,
} as const;

const getSeller = async (id: string) => {
	const seller = await prisma.user.findFirst({
		where: { id, role: Role.SELLER },
		select: sellerSelect,
	});
	if (!seller) throw new AppError("Seller not found.", 404);
	return seller;
};

const create = async (
	payload: CreateSellerPayload,
	adminId: string,
	context: AuditRequestContext,
) => {
	const email = payload.email.trim().toLowerCase();
	const username = payload.username.trim().toLowerCase();
	const existingUser = await prisma.user.findFirst({
		where: { OR: [{ email }, { username }] },
		select: { email: true, username: true },
	});
	if (existingUser?.email === email) {
		throw new AppError("A user with this email already exists.", 409);
	}
	if (existingUser?.username === username) {
		throw new AppError("This username is already taken.", 409);
	}

	const seller = await prisma.user.create({
		data: {
			name: payload.name,
			username,
			email,
			contactNumber: payload.contactNumber,
			businessProfile: payload.businessProfile as
				| Prisma.InputJsonValue
				| undefined,
			passwordHash: await bcrypt.hash(
				payload.initialPassword,
				Number(config.bcrypt_salt_rounds),
			),
			passwordChangeRequired: true,
			role: Role.SELLER,
			status: UserStatus.ACTIVE,
		},
		select: sellerSelect,
	});

	await auditService.log({
		userId: adminId,
		action: "SELLER_CREATED",
		category: "USER",
		resourceType: "User",
		resourceId: seller.id,
		description: "Seller account created by an administrator.",
		metadata: { username: seller.username, email: seller.email },
		...context,
	});
	return seller;
};

const list = async () =>
	prisma.user.findMany({
		where: { role: Role.SELLER },
		select: sellerSelect,
		orderBy: { createdAt: "desc" },
	});

const getById = (id: string) => getSeller(id);

const update = async (
	id: string,
	payload: UpdateSellerPayload,
	adminId: string,
	context: AuditRequestContext,
) => {
	await getSeller(id);
	const email = payload.email?.trim().toLowerCase();
	const username = payload.username?.trim().toLowerCase();
	if (email || username) {
		const duplicate = await prisma.user.findFirst({
			where: {
				id: { not: id },
				OR: [
					...(email ? [{ email }] : []),
					...(username ? [{ username }] : []),
				],
			},
			select: { email: true, username: true },
		});
		if (duplicate?.email === email) {
			throw new AppError("A user with this email already exists.", 409);
		}
		if (duplicate?.username === username) {
			throw new AppError("This username is already taken.", 409);
		}
	}

	const seller = await prisma.user.update({
		where: { id },
		data: {
			...(payload.name !== undefined ? { name: payload.name } : {}),
			...(username !== undefined ? { username } : {}),
			...(email !== undefined ? { email } : {}),
			...(payload.contactNumber !== undefined
				? { contactNumber: payload.contactNumber || null }
				: {}),
			...(payload.businessProfile !== undefined
				? {
						businessProfile: payload.businessProfile as Prisma.InputJsonValue,
					}
				: {}),
			...(payload.status !== undefined ? { status: payload.status } : {}),
		},
		select: sellerSelect,
	});

	await auditService.log({
		userId: adminId,
		action: "SELLER_UPDATED",
		category: "USER",
		resourceType: "User",
		resourceId: id,
		description: "Seller account updated by an administrator.",
		metadata: { changedFields: Object.keys(payload) },
		...context,
	});
	return seller;
};

const deactivate = async (
	id: string,
	adminId: string,
	context: AuditRequestContext,
) => {
	await getSeller(id);
	const seller = await prisma.user.update({
		where: { id },
		data: { status: UserStatus.BLOCKED },
		select: sellerSelect,
	});
	await auditService.log({
		userId: adminId,
		action: "SELLER_DEACTIVATED",
		category: "USER",
		resourceType: "User",
		resourceId: id,
		description: "Seller account deactivated by an administrator.",
		...context,
	});
	return seller;
};

const getProfile = (userId: string) => getSeller(userId);

const updateProfile = async (
	userId: string,
	payload: UpdateSellerProfilePayload,
	context: AuditRequestContext,
) => {
	const seller = await getSeller(userId);
	const username = payload.username?.trim().toLowerCase();
	if (username && username !== seller.username) {
		const duplicate = await prisma.user.findUnique({
			where: { username },
			select: { id: true },
		});
		if (duplicate) throw new AppError("This username is already taken.", 409);
	}

	const emailChangeRequested =
		payload.email !== undefined &&
		payload.email.trim().toLowerCase() !== seller.email.toLowerCase();
	const updateData = {
		...(payload.name !== undefined ? { name: payload.name } : {}),
		...(username !== undefined ? { username } : {}),
		...(payload.contactNumber !== undefined
			? { contactNumber: payload.contactNumber || null }
			: {}),
		...(payload.businessProfile !== undefined
			? {
					businessProfile: payload.businessProfile as Prisma.InputJsonValue,
				}
			: {}),
	};
	const updated = Object.keys(updateData).length
		? await prisma.user.update({
				where: { id: userId },
				data: updateData,
				select: sellerSelect,
			})
		: seller;

	await auditService.log({
		userId,
		action: "SELLER_PROFILE_UPDATED",
		category: "USER",
		resourceType: "User",
		resourceId: userId,
		description: "Seller profile updated.",
		metadata: {
			changedFields: Object.keys(payload).filter((field) => field !== "email"),
		},
		...context,
	});

	if (emailChangeRequested) {
		await requestEmailChange(userId, payload.email as string, context);
	}
	return {
		profile: updated,
		emailVerificationRequired: emailChangeRequested,
	};
};

const emailVerificationKey = (userId: string) =>
	`seller-email-change:${userId}`;

const initialEmailVerificationKey = (userId: string) =>
	`seller-initial-email-verification:${userId}`;

const requestEmailChange = async (
	userId: string,
	email: string,
	context: AuditRequestContext,
) => {
	const normalizedEmail = email.trim().toLowerCase();
	const existing = await prisma.user.findUnique({
		where: { email: normalizedEmail },
		select: { id: true },
	});
	if (existing && existing.id !== userId) {
		throw new AppError("A user with this email already exists.", 409);
	}
	if (!redisClient.isReady) {
		throw new AppError("Email verification is temporarily unavailable.", 503);
	}

	const otp = randomInt(100000, 1000000).toString();
	const key = emailVerificationKey(userId);
	try {
		await redisClient.set(
			key,
			JSON.stringify({ email: normalizedEmail, otp }),
			{
				expiration: { type: "EX", value: 10 * 60 },
			},
		);
		await transporter.sendMail({
			from: config.email_sender,
			to: normalizedEmail,
			subject: "Verify your new seller account email",
			text: `Your email verification code is ${otp}. It expires in 10 minutes.`,
		});
	} catch (error) {
		console.error(
			"Could not send the seller email verification code.",
			error instanceof Error ? error.message : error,
		);
		if (redisClient.isReady) await redisClient.del(key);
		throw new AppError(
			"Email verification could not be sent. Please try again.",
			503,
		);
	}

	await auditService.log({
		userId,
		action: "SELLER_EMAIL_CHANGE_REQUESTED",
		category: "USER",
		resourceType: "User",
		resourceId: userId,
		description: "Seller requested an email address change.",
		metadata: { email: normalizedEmail },
		...context,
	});
};

const verifyEmailChange = async (
	userId: string,
	payload: VerifySellerEmailPayload,
	context: AuditRequestContext,
) => {
	const key = emailVerificationKey(userId);
	const value = await redisClient.get(key);
	if (!value) {
		throw new AppError("Verification code is invalid or expired.", 400);
	}
	const pending = JSON.parse(value) as { email: string; otp: string };
	if (
		pending.otp !== payload.otp ||
		pending.email !== payload.email.trim().toLowerCase()
	) {
		throw new AppError("Verification code is invalid or expired.", 400);
	}

	const existing = await prisma.user.findUnique({
		where: { email: pending.email },
		select: { id: true },
	});
	if (existing && existing.id !== userId) {
		throw new AppError("A user with this email already exists.", 409);
	}

	const updated = await prisma.user.update({
		where: { id: userId },
		data: { email: pending.email },
		select: sellerSelect,
	});
	await redisClient.del(key);
	await auditService.log({
		userId,
		action: "SELLER_EMAIL_CHANGED",
		category: "USER",
		resourceType: "User",
		resourceId: userId,
		description: "Seller email address changed after verification.",
		metadata: { email: updated.email },
		...context,
	});
	return updated;
};

const requestInitialEmailVerification = async (
	userId: string,
	context: AuditRequestContext,
) => {
	const seller = await prisma.user.findFirst({
		where: { id: userId, role: Role.SELLER },
		select: { email: true, passwordChangeRequired: true },
	});
	if (!seller) throw new AppError("Seller not found.", 404);
	if (!seller.passwordChangeRequired) {
		throw new AppError("Initial seller verification is already complete.", 409);
	}
	if (!redisClient.isReady) {
		throw new AppError("Email verification is temporarily unavailable.", 503);
	}

	const otp = randomInt(100000, 1000000).toString();
	const key = initialEmailVerificationKey(userId);
	try {
		await redisClient.set(
			key,
			JSON.stringify({ email: seller.email, otp }),
			{ expiration: { type: "EX", value: 10 * 60 } },
		);
		await transporter.sendMail({
			from: config.email_sender,
			to: seller.email,
			subject: "Verify your seller account email",
			text: `Your seller account verification code is ${otp}. It expires in 10 minutes.`,
		});
	} catch (error) {
		console.error(
			"Could not send the initial seller email verification code.",
			error instanceof Error ? error.message : error,
		);
		if (redisClient.isReady) await redisClient.del(key);
		throw new AppError(
			"Email verification could not be sent. Please try again.",
			503,
		);
	}

	await auditService.log({
		userId,
		action: "SELLER_EMAIL_VERIFICATION_REQUESTED",
		category: "USER",
		resourceType: "User",
		resourceId: userId,
		description: "Seller requested initial account email verification.",
		...context,
	});
};

const verifyInitialEmail = async (
	userId: string,
	payload: VerifyInitialSellerEmailPayload,
	context: AuditRequestContext,
) => {
	const seller = await prisma.user.findFirst({
		where: { id: userId, role: Role.SELLER },
		select: { email: true, passwordChangeRequired: true },
	});
	if (!seller) throw new AppError("Seller not found.", 404);
	if (!seller.passwordChangeRequired) {
		throw new AppError("Initial seller verification is already complete.", 409);
	}
	if (!redisClient.isReady) {
		throw new AppError("Email verification is temporarily unavailable.", 503);
	}

	const key = initialEmailVerificationKey(userId);
	const value = await redisClient.get(key);
	if (!value) {
		throw new AppError("Verification code is invalid or expired.", 400);
	}
	const pending = JSON.parse(value) as { email: string; otp: string };
	if (pending.otp !== payload.otp || pending.email !== seller.email) {
		throw new AppError("Verification code is invalid or expired.", 400);
	}

	await prisma.user.update({
		where: { id: userId },
		data: { passwordChangeRequired: false },
	});
	await redisClient.del(key);
	await auditService.log({
		userId,
		action: "SELLER_EMAIL_VERIFIED",
		category: "USER",
		resourceType: "User",
		resourceId: userId,
		description: "Seller verified their account email address.",
		...context,
	});
};

const changePassword = async (
	userId: string,
	payload: ChangeSellerPasswordPayload,
	context: AuditRequestContext,
) => {
	const seller = await prisma.user.findFirst({
		where: { id: userId, role: Role.SELLER },
		select: { id: true, passwordHash: true },
	});
	if (!seller) throw new AppError("Seller not found.", 404);
	if (!(await bcrypt.compare(payload.currentPassword, seller.passwordHash))) {
		throw new AppError("Current password is incorrect.", 400);
	}
	if (payload.currentPassword === payload.newPassword) {
		throw new AppError(
			"New password must be different from the current password.",
			400,
		);
	}

	await prisma.user.update({
		where: { id: userId },
		data: {
			passwordHash: await bcrypt.hash(
				payload.newPassword,
				Number(config.bcrypt_salt_rounds),
			),
			passwordChangeRequired: false,
		},
	});
	await auditService.log({
		userId,
		action: "PASSWORD_CHANGED",
		category: "AUTH",
		resourceType: "User",
		resourceId: userId,
		description: "Seller changed their account password.",
		...context,
	});
};

const getDashboard = async (sellerId: string) => {
	const sellerProductFilter = { product: { is: { sellerId } } };
	const [productCount, paidSales, recentSales, recentInsights] =
		await Promise.all([
			prisma.product.count({ where: { sellerId } }),
			prisma.productOrder.aggregate({
				where: { ...sellerProductFilter, status: PamentStatus.PAID },
				_sum: { amount: true },
				_count: { _all: true },
			}),
			prisma.productOrder.findMany({
				where: { ...sellerProductFilter, status: PamentStatus.PAID },
				orderBy: { paidAt: "desc" },
				take: 10,
				select: {
					id: true,
					amount: true,
					currency: true,
					paidAt: true,
					product: { select: { id: true, name: true, title: true } },
				},
			}),
			prisma.queryHistory.findMany({
				where: {
					userId: sellerId,
					status: QueryStatus.SUCCESS,
					resultSummary: { not: null },
				},
				orderBy: { createdAt: "desc" },
				take: 5,
				select: {
					id: true,
					question: true,
					resultSummary: true,
					createdAt: true,
				},
			}),
		]);

	return {
		productCount,
		salesCount: paidSales._count._all,
		revenue: Number(paidSales._sum.amount ?? 0),
		recentSales,
		recentInsights,
	};
};

const getSales = async (sellerId: string) =>
	prisma.productOrder.findMany({
		where: { product: { is: { sellerId } } },
		orderBy: { createdAt: "desc" },
		select: {
			id: true,
			amount: true,
			currency: true,
			status: true,
			paidAt: true,
			createdAt: true,
			product: { select: { id: true, name: true, title: true } },
		},
	});

export const sellerService = {
	create,
	list,
	getById,
	update,
	deactivate,
	getProfile,
	updateProfile,
	requestEmailChange,
	verifyEmailChange,
	requestInitialEmailVerification,
	verifyInitialEmail,
	changePassword,
	getDashboard,
	getSales,
};
