import { Router } from "express";
import { auth } from "../../middleware/checkAuth";
import { validedRequest } from "../../middleware/validedRequest";
import { queryController } from "./query.controller";
import { runQuerySchema } from "./query.validation";

const router = Router();

router.post("/", auth(), validedRequest(runQuerySchema), queryController.runQuery);
router.get("/history", auth(), queryController.getQueryHistory);

export const queryRoute = router;