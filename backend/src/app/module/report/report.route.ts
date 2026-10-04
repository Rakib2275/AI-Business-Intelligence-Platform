import { Router } from "express";
import { auth } from "../../middleware/checkAuth";
import { validedRequest } from "../../middleware/validedRequest";
import { reportController } from "./report.controller";
import { createReportSchema } from "./report.validation";

const router = Router();

router.post("/", auth(), validedRequest(createReportSchema), reportController.createReport);
router.get("/:id/download", auth(), reportController.downloadReport);

export const reportRoute = router;