import { Router } from "express";
import {
  requireAuth,
  requireRole,
  requireBusinessContext,
} from "../middlewares/auth.js";
import { requireUuidParam } from "../middlewares/validate.js";
import {
  getMyBusiness,
  updateMyBusiness,
  updateMyBusinessSocials,
  listBranches,
  createBranch,
  updateBranch,
  deleteBranch,
  listStaff,
  createStaff,
  deleteStaff,
} from "../controllers/businessController.js";

const router = Router();

// All routes require auth + business context
router.use(
  requireAuth,
  requireRole("business_owner", "staff"),
  requireBusinessContext,
);

/* ─── Profile ─────────────────────────────── */
router.get("/profile", getMyBusiness);
router.put("/profile", requireRole("business_owner"), updateMyBusiness);
router.put("/socials", requireRole("business_owner"), updateMyBusinessSocials);

/* ─── Branches ────────────────────────────── */
router.get("/branches", listBranches);
router.post("/branches", requireRole("business_owner"), createBranch);
router.put(
  "/branches/:id",
  requireRole("business_owner"),
  requireUuidParam("id"),
  updateBranch,
);
router.delete(
  "/branches/:id",
  requireRole("business_owner"),
  requireUuidParam("id"),
  deleteBranch,
);

/* ─── Staff ───────────────────────────────── */
router.get("/staff", requireRole("business_owner"), listStaff);
router.post("/staff", requireRole("business_owner"), createStaff);
router.delete(
  "/staff/:id",
  requireRole("business_owner"),
  requireUuidParam("id"),
  deleteStaff,
);

export default router;
