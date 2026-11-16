import type { Request, Response } from "express";
import httpStatus from "http-status";
import { AppError } from "../../utils/appError.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { getAuditRequestContext } from "../audit/audit.service.js";
import { sellerService } from "./seller.service.js";

const requireUserId = (req: Request) => {
	const userId = req.user?.userId;
	if (!userId)
		throw new AppError("Authentication required.", httpStatus.UNAUTHORIZED);
	return userId;
};

const requireSellerId = (req: Request) => {
	const sellerId = req.params.id;
	if (typeof sellerId !== "string") {
		throw new AppError("Seller ID is required.", httpStatus.BAD_REQUEST);
	}
	return sellerId;
};

const create = catchAsync(async (req: Request, res: Response) => {
	const seller = await sellerService.create(
		req.body,
		requireUserId(req),
		getAuditRequestContext(req),
	);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Seller account created successfully.",
		data: seller,
	});
});

const list = catchAsync(async (_req: Request, res: Response) => {
	const sellers = await sellerService.list();
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Sellers retrieved successfully.",
		data: sellers,
	});
});

const getById = catchAsync(async (req: Request, res: Response) => {
	const seller = await sellerService.getById(requireSellerId(req));
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Seller retrieved successfully.",
		data: seller,
	});
});

const update = catchAsync(async (req: Request, res: Response) => {
	const seller = await sellerService.update(
		requireSellerId(req),
		req.body,
		requireUserId(req),
		getAuditRequestContext(req),
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Seller updated successfully.",
		data: seller,
	});
});

const deactivate = catchAsync(async (req: Request, res: Response) => {
	const seller = await sellerService.deactivate(
		requireSellerId(req),
		requireUserId(req),
		getAuditRequestContext(req),
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Seller deactivated successfully.",
		data: seller,
	});
});

const getProfile = catchAsync(async (req: Request, res: Response) => {
	const profile = await sellerService.getProfile(requireUserId(req));
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Seller profile retrieved successfully.",
		data: profile,
	});
});

const updateProfile = catchAsync(async (req: Request, res: Response) => {
	const result = await sellerService.updateProfile(
		requireUserId(req),
		req.body,
		getAuditRequestContext(req),
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: result.emailVerificationRequired
			? "Profile updated. Verify the new email address to apply the change."
			: "Seller profile updated successfully.",
		data: result,
	});
});

const verifyEmailChange = catchAsync(async (req: Request, res: Response) => {
	const seller = await sellerService.verifyEmailChange(
		requireUserId(req),
		req.body,
		getAuditRequestContext(req),
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Seller email address verified and updated.",
		data: seller,
	});
});

const requestInitialEmailVerification = catchAsync(
	async (req: Request, res: Response) => {
		await sellerService.requestInitialEmailVerification(
			requireUserId(req),
			getAuditRequestContext(req),
		);
		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Verification code sent to your seller account email.",
			data: null,
		});
	},
);

const verifyInitialEmail = catchAsync(async (req: Request, res: Response) => {
	await sellerService.verifyInitialEmail(
		requireUserId(req),
		req.body,
		getAuditRequestContext(req),
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Seller email verified successfully.",
		data: null,
	});
});

const changePassword = catchAsync(async (req: Request, res: Response) => {
	await sellerService.changePassword(
		requireUserId(req),
		req.body,
		getAuditRequestContext(req),
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Password changed successfully.",
		data: null,
	});
});

const getDashboard = catchAsync(async (req: Request, res: Response) => {
	const dashboard = await sellerService.getDashboard(requireUserId(req));
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Seller dashboard retrieved successfully.",
		data: dashboard,
	});
});

const getSales = catchAsync(async (req: Request, res: Response) => {
	const sales = await sellerService.getSales(requireUserId(req));
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Seller sales retrieved successfully.",
		data: sales,
	});
});

export const sellerController = {
	create,
	list,
	getById,
	update,
	deactivate,
	getProfile,
	updateProfile,
	verifyEmailChange,
	requestInitialEmailVerification,
	verifyInitialEmail,
	changePassword,
	getDashboard,
	getSales,
};
