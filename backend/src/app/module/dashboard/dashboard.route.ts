import { Router } from "express";
import { Role } from "../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { dashboardController } from "./dashboard.controller.js";

const router = Router();

router.use(auth(Role.ADMIN, Role.SUPER_ADMIN, Role.SELLER));
router.post("/", dashboardController.create);
router.get("/", dashboardController.list);
router.patch("/:id/widgets/reorder", dashboardController.reorderWidgets);
router.get("/:id/widgets", dashboardController.listWidgets);
router.post("/:id/widgets", dashboardController.createWidget);
router.post(
	"/:id/widgets/:widgetId/refresh",
	dashboardController.refreshWidget,
);
router.patch("/:id/widgets/:widgetId", dashboardController.updateWidget);
router.delete("/:id/widgets/:widgetId", dashboardController.removeWidget);
router.get("/:id", dashboardController.get);
router.patch("/:id", dashboardController.update);
router.delete("/:id", dashboardController.remove);

export const dashboardRoute = router;
