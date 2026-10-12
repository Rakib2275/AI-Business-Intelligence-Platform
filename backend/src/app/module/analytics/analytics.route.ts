import { Router } from "express";
import { auth } from "../../middleware/checkAuth.js";
import { validedRequest } from "../../middleware/validedRequest.js";
import { analyticsController } from "./analytics.controller.js";
import { anomalySchema, forecastSchema } from "./analytics.validation.js";

const router = Router();

router.post("/forecast", auth(), validedRequest(forecastSchema), analyticsController.forecast);
router.post("/anomalies", auth(), validedRequest(anomalySchema), analyticsController.detectAnomalies);

export const analyticsRoute = router;