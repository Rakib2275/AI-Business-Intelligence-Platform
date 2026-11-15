import { Router } from "express";
import { Role } from "../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { conversationController } from "./conversation.controller.js";

const router = Router();

router.use(auth(Role.ADMIN, Role.SUPER_ADMIN, Role.SELLER));
router.post("/", conversationController.create);
router.get("/", conversationController.list);
router.get("/:id/messages", conversationController.listMessages);
router.post("/:id/messages", conversationController.createMessage);
router.delete("/:id/messages/:messageId", conversationController.deleteMessage);
router.post("/:id/ask", conversationController.ask);
router.get("/:id", conversationController.get);
router.patch("/:id", conversationController.update);
router.delete("/:id", conversationController.remove);

export const conversationRoute = router;
