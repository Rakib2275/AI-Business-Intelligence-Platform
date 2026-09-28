import { NextFunction, Request, Response, Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { AuthController } from "./auth.controller";
import { ForgotPasswordZodSchema, LoginZodSchema, PatienRegistrationZodSchema, PatientEmailVerifyZodSchema, ResetPasswordZodSchema } from "./authValidation";
import { catchAsync } from "../../utils/catchAsync";
import z from "zod";
import { validedRequest } from "../../middleware/validedRequest";

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
router.get(
	"/me",
	auth(Role.ADMIN, Role.DOCTOR, Role.PATIENT, Role.SUPER_ADMIN),
	AuthController.getMe,
);
router.post("/refresh-token", AuthController.refreshToken);
router.post("google",AuthController.googleLogin)
router.post("/forgot-password",
	validedRequest(ForgotPasswordZodSchema),
	AuthController.forgotPassword);
router.post("/reset-password",
	validedRequest(ResetPasswordZodSchema),
	AuthController.resetPassword)

export const AuthRoutes = router;
