import { Router } from "express";
import multer from "multer";
import { Role } from "../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { validedRequest } from "../../middleware/validedRequest.js";
import { productController } from "../product/product.controller.js";
import { productPhotoUpload } from "../product/product.route.js";
import { UserController } from "../user/user.controller.js";
import { sellerController } from "./seller.controller.js";
import {
	changeSellerPasswordSchema,
	updateSellerProfileSchema,
	verifySellerEmailSchema,
} from "./seller.validation.js";

const router = Router();
const profileImageUpload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 10 * 1024 * 1024, files: 1 },
});

router.use(auth(Role.SELLER));
router.get("/profile", sellerController.getProfile);
router.patch(
	"/profile",
	validedRequest(updateSellerProfileSchema),
	sellerController.updateProfile,
);
router.post(
	"/profile/verify-email",
	validedRequest(verifySellerEmailSchema),
	sellerController.verifyEmailChange,
);
router.patch(
	"/profile-image",
	profileImageUpload.single("profileImage"),
	UserController.uploadProfileImage,
);
router.patch(
	"/change-password",
	validedRequest(changeSellerPasswordSchema),
	sellerController.changePassword,
);
router.get("/dashboard", sellerController.getDashboard);
router.get("/sales", sellerController.getSales);
router.get("/products", productController.getSellerProducts);
router.post(
	"/products",
	productPhotoUpload.single("photo"),
	productController.createProduct,
);

export const sellerRoute = router;
