import { Router } from "express";
import { authenticate, authorize } from "../middlewares/auth";
import {
  getAllStocks,
  getStockById,
  getLowStock,
  getStockHistory,
  adjustStock,
  updateMinStock,
} from "../controllers/stock.controller";

const router = Router();

// Semua route stock memerlukan authentication
router.use(authenticate);

// View routes
router.get(
  "/",
  authorize(["SUPERADMIN", "ADMIN", "MANAGER", "GUDANG"]),
  getAllStocks,
);
router.get(
  "/low-stock",
  authorize(["SUPERADMIN", "ADMIN", "MANAGER", "GUDANG"]),
  getLowStock,
);
router.get(
  "/history",
  authorize(["SUPERADMIN", "ADMIN", "MANAGER", "GUDANG"]),
  getStockHistory,
);
router.get(
  "/:id",
  authorize(["SUPERADMIN", "ADMIN", "MANAGER", "GUDANG"]),
  getStockById,
);

// Write operations
router.post(
  "/adjust",
  authorize(["SUPERADMIN", "ADMIN", "MANAGER", "GUDANG"]),
  adjustStock,
);
router.put(
  "/:id/min-stock",
  authorize(["SUPERADMIN", "ADMIN", "MANAGER", "GUDANG"]),
  updateMinStock,
);

export default router;
