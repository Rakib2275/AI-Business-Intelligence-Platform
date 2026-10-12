import { Router } from "express";
import { auth } from "../../middleware/checkAuth.js";
import { validedRequest } from "../../middleware/validedRequest.js";
import { queryController } from "./query.controller.js";
import { runQuerySchema } from "./query.validation.js";

const router = Router();

router.post("/", auth(), validedRequest(runQuerySchema), queryController.runQuery);
router.get("/history", auth(), queryController.getQueryHistory);

export const queryRoute = router;