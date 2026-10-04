import { Router } from "express";
import { auth } from "../../middleware/checkAuth";
import { conversationController } from "./conversation.controller";

const router = Router();

router.use(auth());
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
