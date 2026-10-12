import type { Request, Response } from "express";
import httpStatus from "http-status";
import { AppError } from "../../utils/appError.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { getAuditRequestContext } from "../audit/audit.service.js";
import { productService } from "./product.service.js";

const createProduct = catchAsync(async (req: Request, res: Response) => {
	const userId = req.user?.userId;
	if (!userId) {
		throw new AppError("Unauthorized", httpStatus.UNAUTHORIZED);
	}

	const product = await productService.createProduct(
		userId,
		req.body,
		productService.requirePhoto(req.file),
		getAuditRequestContext(req),
	);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Product created successfully.",
		data: product,
	});
});

const getPublicProducts = catchAsync(async (_req: Request, res: Response) => {
	const products = await productService.getPublicProducts();

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Products retrieved successfully.",
		data: products,
	});
});

export const productController = {
	createProduct,
	getPublicProducts,
};
