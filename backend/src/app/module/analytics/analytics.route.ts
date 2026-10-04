import { Router } from "express";
import { auth } from "../../middleware/checkAuth";
import { validedRequest } from "../../middleware/validedRequest";
import { analyticsController } from "./analytics.controller";
import { anomalySchema, forecastSchema } from "./analytics.validation";

const router = Router();

router.post("/forecast", auth(), validedRequest(forecastSchema), analyticsController.forecast);
router.post("/anomalies", auth(), validedRequest(anomalySchema), analyticsController.detectAnomalies);

export const analyticsRoute = router;