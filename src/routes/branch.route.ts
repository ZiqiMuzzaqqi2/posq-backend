// ============================================
// ROUTES BRANCH MANAGEMENT
// ============================================
import { Router } from "express";
import { authenticate, authorize } from "../middlewares/auth";
import {
  getAllBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch,
  toggleBranchStatus,
} from "../controllers/branch.controller";

const router = Router();

// Semua route branch memerlukan authentication
router.use(authenticate);

// SUPERADMIN only routes
router.post("/", authorize(["SUPERADMIN"]), createBranch);
router.put("/:id", authorize(["SUPERADMIN"]), updateBranch);
router.delete("/:id", authorize(["SUPERADMIN"]), deleteBranch);
router.patch("/:id/toggle", authorize(["SUPERADMIN"]), toggleBranchStatus);

// SUPERADMIN & ADMIN can view branches
router.get("/", authorize(["SUPERADMIN", "ADMIN"]), getAllBranches);
router.get("/:id", authorize(["SUPERADMIN", "ADMIN"]), getBranchById);

export default router;
