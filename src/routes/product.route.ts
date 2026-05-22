// ============================================
// ROUTES PRODUCT MANAGEMENT
// ============================================
import { Router } from "express";
import { authenticate, authorize } from "../middlewares/auth";
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductStatus,
} from "../controllers/product.controller";

const router = Router();

// Semua route product memerlukan authentication
router.use(authenticate);

// View routes (semua role yang sudah login bisa lihat)
router.get(
  "/",
  authorize(["SUPERADMIN", "ADMIN", "MANAGER", "KASIR", "GUDANG"]),
  getAllProducts,
);
router.get(
  "/:id",
  authorize(["SUPERADMIN", "ADMIN", "MANAGER", "KASIR", "GUDANG"]),
  getProductById,
);

// Write operations
router.post(
  "/",
  authorize(["SUPERADMIN", "ADMIN", "MANAGER", "GUDANG"]),
  createProduct,
);
router.put(
  "/:id",
  authorize(["SUPERADMIN", "ADMIN", "MANAGER", "GUDANG"]),
  updateProduct,
);
router.delete("/:id", authorize(["SUPERADMIN", "ADMIN"]), deleteProduct);
router.patch(
  "/:id/toggle",
  authorize(["SUPERADMIN", "ADMIN", "MANAGER"]),
  toggleProductStatus,
);

export default router;
