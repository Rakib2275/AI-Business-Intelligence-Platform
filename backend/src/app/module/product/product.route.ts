import { Router } from "express";
import multer from "multer";
import { Role } from "../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { productController } from "./product.controller.js";

const router = Router();
const productPhotoUpload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: 10 * 1024 * 1024,
		files: 1,
	},
});

router.get("/", productController.getPublicProducts);
router.post(
	"/",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	productPhotoUpload.single("photo"),
	productController.createProduct,
);

export const productRoute = router;
