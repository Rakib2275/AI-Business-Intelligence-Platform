import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { Prisma } from "../../generated/prisma/client.js";
import config from "../config/index.js";
import { ZodError } from "zod";
import { AppError } from "../utils/appError.js";

export const globalErrorHandler = async (
	err: unknown,
	req: Request,
	res: Response,
	_next: NextFunction,
) => {
	let statusCode: number = httpStatus.INTERNAL_SERVER_ERROR;
	let errorMessage = "Internal Server Error";
	const errorDetails = typeof err === "object" && err !== null
		? err as {
				statusCode?: unknown;
				status?: unknown;
				stack?: unknown;
				type?: unknown;
			}
		: {};
	const providedStatus = errorDetails.statusCode ?? errorDetails.status;
	if (typeof providedStatus === "number") statusCode = providedStatus;
	const isMalformedJson =
		err instanceof SyntaxError && errorDetails.type === "entity.parse.failed";
	let isDatabaseSchemaError = false;

	if (isMalformedJson) {
		statusCode = httpStatus.BAD_REQUEST;
		errorMessage = "Request body must contain valid JSON.";
	} else if (err instanceof ZodError) {
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
		} else if (err.code === "P2021" || err.code === "P2022") {
			statusCode = httpStatus.SERVICE_UNAVAILABLE;
			errorMessage =
				"Payment storage is not ready. Apply the pending database migrations and try again.";
			isDatabaseSchemaError = true;
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

	if (statusCode >= httpStatus.INTERNAL_SERVER_ERROR) {
		if (config.node_env === "development") {
			console.error("Error from Global Error Handler", err);
		} else {
			console.error("Unhandled API error", {
				method: req.method,
				path: req.path,
				name: err instanceof Error ? err.name : "UnknownError",
				prismaCode:
					err instanceof Prisma.PrismaClientKnownRequestError
						? err.code
						: undefined,
			});
		}
	}

	res.status(statusCode).json({
		success: false,
		statusCode: statusCode || httpStatus.INTERNAL_SERVER_ERROR,
		name: config.node_env === "development"
			? isMalformedJson
				? "Bad Request"
				: err instanceof Error
					? err.name
					: "Internal Server Error"
			: "Internal Server Error",
		message:
			config.node_env === "development" ||
			statusCode < 500 ||
			err instanceof AppError ||
			isDatabaseSchemaError
				? errorMessage
				: "Internal Server Error",
		error:
			config.node_env === "development" && statusCode >= 500
				? err
				: undefined,
		stack:
			config.node_env === "development" && statusCode >= 500
				? errorDetails.stack
				: undefined,
	});
};
