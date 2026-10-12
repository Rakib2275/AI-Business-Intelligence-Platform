import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Application, type Response } from "express";
import httpStatus from "http-status";
import config from "./app/config/index.js";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler.js";
import { notFound } from "./app/middleware/notFound.js";
import { analyticsRoute } from "./app/module/analytics/analytics.route.js";
import { auditRoute } from "./app/module/audit/audit.route.js";
import { AuthRoutes } from "./app/module/auth/auth.route.js";
import { businessDataRoute } from "./app/module/business-data/businessData.route.js";
import { conversationRoute } from "./app/module/conversation/conversation.route.js";
import { dashboardRoute } from "./app/module/dashboard/dashboard.route.js";
import { productRoute } from "./app/module/product/product.route.js";
import { paymentRoute } from "./app/module/payment/payment.route.js";
import { queryRoute } from "./app/module/query/query.route.js";
import { reportRoute } from "./app/module/report/report.route.js";
import { UserRoutes } from "./app/module/user/user.route.js";

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
app.use("/api/v1/audit", auditRoute);
app.use("/api/v1/conversations", conversationRoute);
app.use("/api/v1/dashboards", dashboardRoute);
app.use("/api/v1/products", productRoute);
app.use("/api/v1/payments", paymentRoute);

app.get("/", (_req, res: Response) => {
	res.status(httpStatus.OK).json({
		success: true,
		message: " AI-Powered Business Intelligence Platform Backend",
	});
});

app.use(globalErrorHandler);
app.use(notFound);

export default app;
