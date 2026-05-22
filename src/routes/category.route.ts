import { Router } from "express";
import { authenticate, authorize } from "../middlewares/auth";
import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/category.controller";

const router = Router();

// Semua route category memerlukan authentication
router.use(authenticate);

// View routes (semua role yang sudah login bisa lihat)
router.get(
  "/",
  authorize(["SUPERADMIN", "ADMIN", "MANAGER", "KASIR", "GUDANG"]),
  getAllCategories,
);
router.get(
  "/:id",
  authorize(["SUPERADMIN", "ADMIN", "MANAGER", "KASIR", "GUDANG"]),
  getCategoryById,
);

// Write operations hanya untuk SUPERADMIN dan ADMIN
router.post("/", authorize(["SUPERADMIN", "ADMIN"]), createCategory);
router.put("/:id", authorize(["SUPERADMIN", "ADMIN"]), updateCategory);
router.delete("/:id", authorize(["SUPERADMIN", "ADMIN"]), deleteCategory);

export default router;
