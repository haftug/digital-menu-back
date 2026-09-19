import { Router } from "express";
import {
  requireAuth,
  requireRole,
  requireBusinessContext,
} from "../middlewares/auth.js";
import {
  listOrders,
  updateOrderStatus,
} from "../controllers/orderController.js";

const router = Router();

router.use(
  requireAuth,
  requireRole("business_owner", "staff"),
  requireBusinessContext,
);

router.get("/", listOrders);
router.patch("/:id/status", updateOrderStatus);

export default router;
