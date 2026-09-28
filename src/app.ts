import cookieParser from "cookie-parser";
import cors from "cors";
import express, { NextFunction, type Application, type Request, type Response } from "express";
import httpStatus from "http-status";
import config from "./app/config";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import { notFound } from "./app/middleware/notFound";
import { AuthRoutes } from "./app/module/auth/auth.route";
import z, { success } from "zod";
import { redisClient } from "./app/lib/redis";
import crypto from "crypto"
import { UserRoutes } from "./app/module/user/user.route";
import { getBkashIdToken } from "./app/lib/bkash";

const app: Application = express();

app.use(
	cors({
		origin: config.frontend_url,
		credentials: true,
	}),
);

// Enable URL-encoded form data parsing
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cookieParser());

app.use("/api/v1/auth", AuthRoutes);
app.use("/api/v1/user",UserRoutes);

app.post("/zod",async (req: Request, res: Response,next: NextFunction) => {
	try {
		const UserZodSchema = z.object({
		name : z.string(),
		age : z.number(),
		isVerified : z.boolean(),
		books : z.array(z.string())
	})
	const payload = req.body;

	const result = UserZodSchema.safeParse(payload)

	

	res.status(httpStatus.OK).json({
		success : true,
		message : "Welcome to AI-Powered Business Intelligence Platform",
		data : result
	})
	} catch (error) {
		console.log(error)
		next(error);

	}
})

app.get("/test",async (req: Request, res: Response,next: NextFunction) => {
	try {
		// const otp = crypto.randomInt(100000,1000000)

		const grantIdTokenResult = await getBkashIdToken()

		console.log(grantIdTokenResult)

		
		res.status(httpStatus.OK).json({
			success : true,
			message : " AI-Powered Business Intelligence Platform",
			data : null
		})
	} catch (error) {
		console.log(error)
		next(error);

	}
})


// Basic route
app.get("/", async (req: Request, res: Response) => {
	res.status(httpStatus.OK).json({
		success: true,
		message: " AI-Powered Business Intelligence Platform Backend",
	});
});

app.use(globalErrorHandler);
app.use(notFound);

export default app;
