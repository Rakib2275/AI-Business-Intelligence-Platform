import { Router } from "express";
import { Role } from "../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { validedRequest } from "../../middleware/validedRequest.js";
import { sellerController } from "./seller.controller.js";
import { createSellerSchema, updateSellerSchema } from "./seller.validation.js";

const router = Router();

router.use(auth(Role.ADMIN, Role.SUPER_ADMIN));
router.post("/", validedRequest(createSellerSchema), sellerController.create);
router.get("/", sellerController.list);
router.get("/:id", sellerController.getById);
router.patch(
	"/:id",
	validedRequest(updateSellerSchema),
	sellerController.update,
);
router.delete("/:id", sellerController.deactivate);

export const adminSellerRoute = router;
