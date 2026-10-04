import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { Prisma } from "../../generated/prisma/client";
import config from "../config";
import { ZodError } from "zod";
import { AppError } from "../utils/appError";

export const globalErrorHandler = async (
	err: unknown,
	_req: Request,
	res: Response,
	_next: NextFunction,
) => {
	if (config.node_env === "development") {
		console.log("Error from Global Error Handler", err);
	}

	let statusCode: number = httpStatus.INTERNAL_SERVER_ERROR;
	let errorMessage = "Internal Server Error";
	const errorName = err instanceof Error ? err.name : "Internal Server Error";
	const errorDetails = typeof err === "object" && err !== null
		? err as { statusCode?: unknown; status?: unknown; stack?: unknown }
		: {};
	const providedStatus = errorDetails.statusCode ?? errorDetails.status;
	if (typeof providedStatus === "number") statusCode = providedStatus;

	if (err instanceof ZodError) {
		statusCode = httpStatus.BAD_REQUEST;
		errorMessage = err.issues[0]?.message || "Validation failed";
	} else if (err instanceof AppError) {
		statusCode = err.statusCode;
		errorMessage = err.message;
	} else if (err instanceof Prisma.PrismaClientValidationError) {
		statusCode = httpStatus.BAD_REQUEST;
		errorMessage = "You have provided incorrect field type or missing fields";
	} else if (err instanceof Prisma.PrismaClientKnownRequestError) {
		if (err.code === "P2002") {
			statusCode = httpStatus.BAD_REQUEST;
			errorMessage = "Duplicate Key Error";
		} else if (err.code === "P2003") {
			statusCode = httpStatus.BAD_REQUEST;
			errorMessage = "Foreign key constraint failed";
		} else if (err.code === "P2025") {
			statusCode = httpStatus.NOT_FOUND;
			errorMessage = "The requested record was not found.";
		}
	} else if (err instanceof Prisma.PrismaClientInitializationError) {
		if (err.errorCode === "P1000") {
			statusCode = httpStatus.SERVICE_UNAVAILABLE;
			errorMessage =
				"Database authentication failed.";
		} else if (err.errorCode === "P1001") {
			statusCode = httpStatus.SERVICE_UNAVAILABLE;
			errorMessage = "Database server is unavailable.";
		}
	} else if (err instanceof Prisma.PrismaClientUnknownRequestError) {
		statusCode = httpStatus.INTERNAL_SERVER_ERROR;
		errorMessage = "Error occurred during query execution";
	} else if (err instanceof Error) {
		errorMessage = err.message;
	}

	res.status(statusCode).json({
		success: false,
		statusCode: statusCode || httpStatus.INTERNAL_SERVER_ERROR,
		name:
			config.node_env === "development" ? errorName : "Internal Server Error",
		message:
			config.node_env === "development" || statusCode < 500
				? errorMessage
				: "Internal Server Error",
		error: config.node_env === "development" ? err : undefined,
		stack: config.node_env === "development" ? errorDetails.stack : undefined,
	});
};
