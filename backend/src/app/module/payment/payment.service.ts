import { randomUUID } from "node:crypto";
import { PamentStatus } from "../../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import { getBkashIdToken } from "../../lib/bkash.js";
import config from "../../config/index.js";
import { AppError } from "../../utils/appError.js";

type BkashCreateResponse = {
	statusCode?: string;
	statusMessage?: string;
	paymentID?: string;
	bkashURL?: string;
};

type BkashExecuteResponse = {
	statusCode?: string;
	statusMessage?: string;
	paymentID?: string;
	trxID?: string;
	transactionStatus?: string;
	amount?: string;
	merchantInvoiceNumber?: string;
};

const bkashHeaders = async () => {
	const authorization = await getBkashIdToken();
	if (!authorization || !config.bkash_app_key) {
		throw new AppError("bKash payment is not configured.", 503);
	}

	return {
		accept: "application/json",
		"content-type": "application/json",
		authorization,
		"x-app-key": config.bkash_app_key,
	};
};

const getProviderResponse = async <T>(response: Response): Promise<T> => {
	const result: unknown = await response.json().catch(() => null);
	if (!response.ok || !result || typeof result !== "object") {
		throw new AppError("bKash payment service is unavailable.", 502);
	}
	return result as T;
};

const isBkashCheckoutUrl = (value: string | undefined): value is string => {
	if (!value) return false;
	try {
		const url = new URL(value);
		return (
			url.protocol === "https:" &&
			(url.hostname === "bka.sh" || url.hostname.endsWith(".bka.sh"))
		);
	} catch {
		return false;
	}
};

const paymentReturnUrl = (orderId: string) => {
	try {
		const url = new URL("/payment-return", config.frontend_url);
		if (url.protocol !== "http:" && url.protocol !== "https:") {
			throw new Error("Invalid payment callback protocol.");
		}
		url.searchParams.set("orderId", orderId);
		return url.toString();
	} catch {
		throw new AppError("The payment callback URL is misconfigured.", 500);
	}
};

const startProductCheckout = async (userId: string, productId: string) => {
	if (!config.bkash_base_url || !config.frontend_url) {
		throw new AppError("bKash payment is not configured.", 503);
	}
	const product = await prisma.product.findUnique({
		where: { id: productId },
		select: { id: true, price: true },
	});
	if (!product) throw new AppError("Product not found.", 404);

	const order = await prisma.productOrder.create({
		data: {
			userId,
			productId,
			amount: product.price,
			merchantInvoiceNumber: `NQ-${randomUUID()}`,
		},
	});

	try {
		const response = await fetch(
			`${config.bkash_base_url}/tokenized/checkout/create`,
			{
				method: "POST",
				headers: await bkashHeaders(),
				body: JSON.stringify({
					mode: "0011",
					payerReference: userId,
					callbackURL: paymentReturnUrl(order.id),
					amount: Number(order.amount).toFixed(2),
					currency: order.currency,
					intent: "sale",
					merchantInvoiceNumber: order.merchantInvoiceNumber,
				}),
			},
		);
		const result = await getProviderResponse<BkashCreateResponse>(response);

		if (
			result.statusCode !== "0000" ||
			!result.paymentID ||
			!isBkashCheckoutUrl(result.bkashURL)
		) {
			throw new AppError(
				result.statusMessage || "Could not start bKash checkout.",
				502,
			);
		}

		await prisma.productOrder.update({
			where: { id: order.id },
			data: { bkashPaymentId: result.paymentID },
		});

		return { orderId: order.id, paymentUrl: result.bkashURL };
	} catch (error) {
		await prisma.productOrder.update({
			where: { id: order.id },
			data: { status: PamentStatus.FAILED },
		});
		throw error;
	}
};

const completeProductCheckout = async (orderId: string, paymentId: string) => {
	const order = await prisma.productOrder.findUnique({
		where: { id: orderId },
		select: {
			id: true,
			status: true,
			amount: true,
			merchantInvoiceNumber: true,
			bkashPaymentId: true,
		},
	});
	if (!order) throw new AppError("Payment order not found.", 404);
	if (order.bkashPaymentId !== paymentId) {
		throw new AppError("Payment does not match this order.", 400);
	}
	if (order.status === PamentStatus.PAID) {
		return { orderId: order.id, status: order.status };
	}

	const response = await fetch(
		`${config.bkash_base_url}/tokenized/checkout/execute`,
		{
			method: "POST",
			headers: await bkashHeaders(),
			body: JSON.stringify({ paymentID: paymentId }),
		},
	);
	const result = await getProviderResponse<BkashExecuteResponse>(response);

	const amountMatches =
		typeof result.amount === "string" &&
		Math.round(Number(result.amount) * 100) ===
			Math.round(Number(order.amount) * 100);
	const paymentSucceeded =
		result.statusCode === "0000" &&
		result.transactionStatus === "Completed" &&
		result.paymentID === paymentId &&
		result.merchantInvoiceNumber === order.merchantInvoiceNumber &&
		amountMatches &&
		typeof result.trxID === "string" &&
		result.trxID.length > 0;

	if (!paymentSucceeded) {
		if (result.statusCode === "0000") {
			await prisma.productOrder.update({
				where: { id: order.id },
				data: { status: PamentStatus.FAILED },
			});
		}
		throw new AppError(
			result.statusMessage || "bKash could not confirm this payment.",
			402,
		);
	}

	const paidOrder = await prisma.productOrder.update({
		where: { id: order.id },
		data: {
			status: PamentStatus.PAID,
			bkashTrxId: result.trxID,
			paidAt: new Date(),
		},
		select: { id: true, status: true },
	});

	return { orderId: paidOrder.id, status: paidOrder.status };
};

const cancelProductCheckout = async (userId: string, orderId: string) => {
	const order = await prisma.productOrder.findFirst({
		where: { id: orderId, userId, status: PamentStatus.UNPAID },
		select: { id: true },
	});
	if (!order) return;

	await prisma.productOrder.update({
		where: { id: order.id },
		data: { status: PamentStatus.CANCELLED },
	});
};

export const paymentService = {
	startProductCheckout,
	completeProductCheckout,
	cancelProductCheckout,
};
