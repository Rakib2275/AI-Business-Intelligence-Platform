import { Router } from "express";
import multer from "multer";

import { auth } from "../../middleware/checkAuth.js";
import { businessDataController } from "./businessData.controller.js";


const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});


// Upload CSV / Excel
router.post(
  "/upload",
  auth(),
  upload.single("file"),
  businessDataController.uploadBusinessData
);


// Create manually
router.post(
  "/",
  auth(),
  businessDataController.createBusinessData
);


// Get all
router.get(
  "/",
  auth(),
  businessDataController.getAllBusinessData
);


// Get single
router.get(
  "/:id",
  auth(),
  businessDataController.getSingleBusinessData
);


// Update
router.patch(
  "/:id",
  auth(),
  businessDataController.updateBusinessData
);


// Delete
router.delete(
  "/:id",
  auth(),
  businessDataController.deleteBusinessData
);

export const businessDataRoute = router;
