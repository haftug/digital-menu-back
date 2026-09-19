import { Router } from "express";
import authRoutes from "./authRoutes.js";
import businessRoutes from "./businessRoutes.js";
import catalogRoutes from "./catalogRoutes.js";
import tableRoutes from "./tableRoutes.js";
import qrRoutes from "./qrRoutes.js";
import orderRoutes from "./orderRoutes.js";
import serviceRoutes from "./serviceRoutes.js";
import platformRoutes from "./platformRoutes.js";
import publicRoutes from "./publicRoutes.js";
import uploadRoutes from "./uploads.js";

const router = Router();

router.get("/health", (req, res) =>
  res.json({ success: true, data: { status: "ok" } }),
);

router.use("/auth", authRoutes);
router.use("/business", businessRoutes);
router.use("/catalog", catalogRoutes);
router.use("/tables", tableRoutes);
router.use("/qr-codes", qrRoutes);
router.use("/orders", orderRoutes);
router.use("/services", serviceRoutes);
router.use("/admin", platformRoutes);
router.use("/public", publicRoutes);
router.use("/uploads", uploadRoutes);

export default router;
