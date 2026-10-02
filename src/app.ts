import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Application, type Response } from "express";
import httpStatus from "http-status";
import config from "./app/config";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import { notFound } from "./app/middleware/notFound";
import { AuthRoutes } from "./app/module/auth/auth.route";
import { UserRoutes } from "./app/module/user/user.route";
import { businessDataRoute } from "./app/module/business-data/businessData.route";
import { queryRoute } from "./app/module/query/query.route";
import { analyticsRoute } from "./app/module/analytics/analytics.route";
import { reportRoute } from "./app/module/report/report.route";

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
app.use("/api/v1/user", UserRoutes);
app.use("/api/v1/business-data", businessDataRoute);
app.use("/business-data", businessDataRoute);
app.use("/api/v1/query", queryRoute);
app.use("/api/v1/analytics", analyticsRoute);
app.use("/api/v1/reports", reportRoute);

app.get("/", (_req, res: Response) => {
	res.status(httpStatus.OK).json({
		success: true,
		message: " AI-Powered Business Intelligence Platform Backend",
	});
});

app.use(globalErrorHandler);
app.use(notFound);

export default app;
