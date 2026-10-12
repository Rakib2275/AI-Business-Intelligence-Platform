import { Router } from "express";
import { auth } from "../../middleware/checkAuth.js";
import { validedRequest } from "../../middleware/validedRequest.js";
import { reportController } from "./report.controller.js";
import { createReportSchema } from "./report.validation.js";

const router = Router();

router.post("/", auth(), validedRequest(createReportSchema), reportController.createReport);
router.get("/:id/download", auth(), reportController.downloadReport);

export const reportRoute = router;