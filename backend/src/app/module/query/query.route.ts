import { Router } from "express";
import { Role } from "../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { validedRequest } from "../../middleware/validedRequest.js";
import { queryController } from "./query.controller.js";
import { runQuerySchema } from "./query.validation.js";

const router = Router();

const analysisRoles = [Role.ADMIN, Role.SUPER_ADMIN, Role.SELLER];

router.post(
	"/",
	auth(...analysisRoles),
	validedRequest(runQuerySchema),
	queryController.runQuery,
);
router.get("/history", auth(...analysisRoles), queryController.getQueryHistory);

export const queryRoute = router;