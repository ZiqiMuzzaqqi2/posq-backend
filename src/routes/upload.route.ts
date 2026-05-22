import { Router } from "express";
import { authenticate } from "../middlewares/auth";
import { uploadImage, handleUpload } from "../controllers/upload.controller";

const router = Router();

// Upload image (perlu authentication)
router.post("/", authenticate, uploadImage, handleUpload);

export default router;
