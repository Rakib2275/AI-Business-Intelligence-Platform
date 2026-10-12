import { Router } from "express";
import { UserController } from "./user.controller.js";
import { upload } from "../../lib/multer.js";
import { auth } from "../../middleware/checkAuth.js";
import { Role } from "../../../generated/prisma/enums.js";

const router = Router();

router.patch("/profile-image",
    auth(Role.SUPER_ADMIN,Role.ADMIN,Role.COUSTOMER,Role.SELLER)
    ,upload.single("profileImage"),UserController.uploadProfileImage);

export const UserRoutes = router;