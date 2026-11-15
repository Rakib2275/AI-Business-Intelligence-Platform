import { Router } from "express";
import multer from "multer";

import { Role } from "../../../generated/prisma/enums.js";
import { auth } from "../../middleware/checkAuth.js";
import { businessDataController } from "./businessData.controller.js";


const router = Router();
const analysisRoles = [Role.ADMIN, Role.SUPER_ADMIN, Role.SELLER];

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});


// Upload CSV / Excel
router.post(
  "/upload",
  auth(...analysisRoles),
  upload.single("file"),
  businessDataController.uploadBusinessData
);


// Create manually
router.post(
  "/",
  auth(...analysisRoles),
  businessDataController.createBusinessData
);


// Get all
router.get(
  "/",
  auth(...analysisRoles),
  businessDataController.getAllBusinessData
);


// Get single
router.get(
  "/:id",
  auth(...analysisRoles),
  businessDataController.getSingleBusinessData
);


// Update
router.patch(
  "/:id",
  auth(...analysisRoles),
  businessDataController.updateBusinessData
);


// Delete
router.delete(
  "/:id",
  auth(...analysisRoles),
  businessDataController.deleteBusinessData
);

export const businessDataRoute = router;
