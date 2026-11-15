import { Router } from "express";
import { Role } from "../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { validedRequest } from "../../middleware/validedRequest.js";
import { reportController } from "./report.controller.js";
import { createReportSchema } from "./report.validation.js";

const router = Router();

const analysisRoles = [Role.ADMIN, Role.SUPER_ADMIN, Role.SELLER];

router.post(
	"/",
	auth(...analysisRoles),
	validedRequest(createReportSchema),
	reportController.createReport,
);
router.get(
	"/:id/download",
	auth(...analysisRoles),
	reportController.downloadReport,
);

export const reportRoute = router;