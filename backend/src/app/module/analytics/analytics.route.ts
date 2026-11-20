import { Router } from "express";
import { Role } from "../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { validedRequest } from "../../middleware/validedRequest.js";
import { analyticsController } from "./analytics.controller.js";
import {
	anomalySchema,
	forecastSchema,
	trainAnomalySchema,
	trainForecastSchema,
} from "./analytics.validation.js";

const router = Router();

const analysisRoles = [Role.ADMIN, Role.SUPER_ADMIN, Role.SELLER];

router.post(
	"/forecast/train",
	auth(...analysisRoles),
	validedRequest(trainForecastSchema),
	analyticsController.trainForecast,
);
router.post(
	"/forecast",
	auth(...analysisRoles),
	validedRequest(forecastSchema),
	analyticsController.forecast,
);
router.post(
	"/anomalies/train",
	auth(...analysisRoles),
	validedRequest(trainAnomalySchema),
	analyticsController.trainAnomalies,
);
router.post(
	"/anomalies",
	auth(...analysisRoles),
	validedRequest(anomalySchema),
	analyticsController.detectAnomalies,
);

export const analyticsRoute = router;
