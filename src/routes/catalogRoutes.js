import { Router } from "express";
import {
  requireAuth,
  requireRole,
  requireBusinessContext,
} from "../middlewares/auth.js";
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listItems,
  createItem,
  updateItem,
  setItemAvailability,
  deleteItem,
  getBranchCatalogConfig,
  setBranchCatalogConfig,
} from "../controllers/catalogController.js";

const router = Router();

router.use(
  requireAuth,
  requireRole("business_owner", "staff"),
  requireBusinessContext,
);

router.get("/categories", listCategories);
router.post("/categories", createCategory);
router.put("/categories/:id", updateCategory);
router.delete("/categories/:id", deleteCategory);

router.get("/items", listItems);
router.post("/items", createItem);
router.patch("/items/:id", updateItem);
router.put("/items/:id", updateItem);
router.patch("/items/:id/availability", setItemAvailability);
router.delete("/items/:id", deleteItem);

// Branch-scoped catalog config
router.get("/branches/:branchId/config", getBranchCatalogConfig);
router.put("/branches/:branchId/config", setBranchCatalogConfig);

export default router;
