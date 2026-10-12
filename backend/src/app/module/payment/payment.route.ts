import { Router } from "express";
import { Role } from "../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { paymentController } from "./payment.controller.js";

const router = Router();

router.post(
	"/products/:productId/checkout",
	auth(Role.COUSTOMER),
	paymentController.startProductCheckout,
);
router.post("/bkash/execute", paymentController.completeProductCheckout);
router.post(
	"/orders/:orderId/cancel",
	auth(Role.COUSTOMER),
	paymentController.cancelProductCheckout,
);

export const paymentRoute = router;
