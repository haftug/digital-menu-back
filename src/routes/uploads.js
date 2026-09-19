import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { uploadSingle, uploadImage } from "../controllers/uploadController.js";

const router = Router();

router.post("/", requireAuth, uploadSingle, uploadImage);

export default router;
