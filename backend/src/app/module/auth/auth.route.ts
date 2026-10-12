import { Router } from "express";
import { Role } from "../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { AuthController } from "./auth.controller.js";
import { ForgotPasswordZodSchema, LoginZodSchema, PatienRegistrationZodSchema, PatientEmailVerifyZodSchema, ResetPasswordZodSchema } from "./authValidation.js";
import { validedRequest } from "../../middleware/validedRequest.js";

const router = Router();


router.post("/register",
	validedRequest(PatienRegistrationZodSchema),
	 AuthController.registerPatient);

router.post("/verify-email",
	validedRequest(PatientEmailVerifyZodSchema),
	 AuthController.verifyPatientEmail);
router.post("/login",
	validedRequest(LoginZodSchema),
	AuthController.loginUser);
router.post("/logout", auth(), AuthController.logout);
router.get(
	"/me",
		auth(Role.ADMIN, Role.COUSTOMER, Role.SELLER, Role.SUPER_ADMIN),
	AuthController.getMe,
);
router.post("/refresh-token", AuthController.refreshToken);
router.post("/forgot-password",
	validedRequest(ForgotPasswordZodSchema),
	AuthController.forgotPassword);
router.post("/reset-password",
	validedRequest(ResetPasswordZodSchema),
	AuthController.resetPassword)

export const AuthRoutes = router;
