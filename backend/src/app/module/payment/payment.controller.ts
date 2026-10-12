import type { Request, Response } from "express";
import httpStatus from "http-status";
import { AppError } from "../../utils/appError.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { paymentService } from "./payment.service.js";

const getUserId = (req: Request) => {
	const userId = req.user?.userId;
	if (!userId) throw new AppError("Authentication required.", 401);
	return userId;
};

const getStringParam = (value: string | string[] | undefined) => {
	if (typeof value !== "string" || !value.trim()) {
		throw new AppError("Invalid request parameter.", 400);
	}
	return value;
};

const startProductCheckout = catchAsync(
	async (req: Request, res: Response) => {
		const result = await paymentService.startProductCheckout(
			getUserId(req),
			getStringParam(req.params.productId),
		);
		sendResponse(res, {
			statusCode: httpStatus.CREATED,
			success: true,
			message: "bKash checkout created.",
			data: result,
		});
	},
);

const completeProductCheckout = catchAsync(
	async (req: Request, res: Response) => {
		const { orderId, paymentID } = req.body ?? {};
		if (
			typeof orderId !== "string" ||
			typeof paymentID !== "string" ||
			!orderId.trim() ||
			!paymentID.trim()
		) {
			throw new AppError("Order and bKash payment IDs are required.", 400);
		}

		const result = await paymentService.completeProductCheckout(
			orderId,
			paymentID,
		);
		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Payment confirmed.",
			data: result,
		});
	},
);

const cancelProductCheckout = catchAsync(
	async (req: Request, res: Response) => {
		await paymentService.cancelProductCheckout(
			getUserId(req),
			getStringParam(req.params.orderId),
		);
		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Checkout cancelled.",
			data: null,
		});
	},
);

export const paymentController = {
	startProductCheckout,
	completeProductCheckout,
	cancelProductCheckout,
};
