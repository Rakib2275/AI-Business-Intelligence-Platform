import { Router } from "express";
import { UserController } from "./user.controller.js";
import { upload } from "../../lib/multer.js";
import { auth } from "../../middleware/checkAuth.js";
import { Role } from "../../../generated/prisma/enums.js";
import { z } from "zod";
import { validedRequest } from "../../middleware/validedRequest.js";

const updateProfileSchema = z.object({
    name: z.string().trim().min(2).max(80),
    contactNumber: z.string().trim().max(30).optional(),
});

const router = Router();

router.patch("/profile", auth(Role.SUPER_ADMIN,Role.ADMIN,Role.COUSTOMER,Role.SELLER), validedRequest(updateProfileSchema), UserController.updateProfile);

router.patch("/profile-image",
    auth(Role.SUPER_ADMIN,Role.ADMIN,Role.COUSTOMER,Role.SELLER)
    ,upload.single("profileImage"),UserController.uploadProfileImage);

export const UserRoutes = router;
