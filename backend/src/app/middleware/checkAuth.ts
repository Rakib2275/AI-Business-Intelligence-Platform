import type { NextFunction, Request, Response } from "express";
import type { JwtPayload } from "jsonwebtoken";
import type { Role } from "../../generated/prisma/enums.js";
import config from "../config/index.js";
import { prisma } from "../lib/prisma.js";
import { catchAsync } from "../utils/catchAsync.js";
import { jwtUtils } from "../utils/jwt.js";
import { AppError } from "../utils/appError.js";

declare global {
	namespace Express {
		interface Request {
			user?: {
				email: string;
				name: string;
				userId: string;
				role: Role;
			};
		}
	}
}

// auth(Role.ADMIN, Role.USER, Role.Author)
// auth() => ...requiredRoles => [Role.ADMIN, Role.USER, Role.AUTHOR]
export const auth = (...requiredRoles: Role[]) => {
	return catchAsync(async (req: Request, _res: Response, next: NextFunction) => {
		const token = req.cookies.accessToken
			? req.cookies.accessToken
			: req.headers.authorization?.startsWith("Bearer ")
				? req.headers.authorization?.split(" ")[1]
				: req.headers.authorization;

		if (!token) {
			throw new AppError(
				"You are not logged in. Please log in to access this resource.",
				401,
			);
		}

		const verifiedToken = jwtUtils.verifyToken(token, config.jwt_access_secret);

		if (!verifiedToken.success) {
			throw new AppError("Invalid or expired access token.", 401);
		}

		const { email, name, userId, role } = verifiedToken.data as JwtPayload;

		if (requiredRoles.length && !requiredRoles.includes(role)) {
			throw new AppError(
				"Forbidden. You don't have permission to access this resource.",
				403,
			);
		}

		const user = await prisma.user.findUnique({
			where: {
				id: userId,
				email,
				name,
				role,
			},
		});

		if (!user) {
			throw new AppError("User not found. Please log in again.", 401);
		}

		if (user.status === "BLOCKED" || user.status === "DELETED") {
			throw new AppError("Your account is inactive. Please contact support.", 403);
		}

		req.user = {
			email,
			name,
			userId,
			role,
		};

		next();
	});
};
