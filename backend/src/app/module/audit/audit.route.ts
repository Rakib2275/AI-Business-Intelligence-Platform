import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { auditController } from "./audit.controller";

const router = Router();
const adminsOnly = auth(Role.ADMIN, Role.SUPER_ADMIN);

router.get("/", adminsOnly, auditController.getLogs);
router.get("/user/:userId", adminsOnly, auditController.getLogsByUser);
router.get(
	"/resource/:resourceType/:resourceId",
	adminsOnly,
	auditController.getLogsByResource,
);
router.get("/:id", adminsOnly, auditController.getLogById);

export const auditRoute = router;
