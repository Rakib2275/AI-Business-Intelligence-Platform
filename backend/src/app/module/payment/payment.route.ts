import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { paymentController } from "./payment.controller";

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
