// ============================================
// ROUTES USER MANAGEMENT
// ============================================
import { Router } from "express";
import { authenticate, authorize } from "../middlewares/auth";
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
} from "../controllers/user.controller";

const router = Router();

// Semua route user memerlukan authentication
router.use(authenticate);

// SUPERADMIN can do everything
// ADMIN can manage users in their own branch (except SUPERADMIN role)
router.get("/", authorize(["SUPERADMIN", "ADMIN"]), getAllUsers);
router.get("/:id", authorize(["SUPERADMIN", "ADMIN"]), getUserById);
router.post("/", authorize(["SUPERADMIN", "ADMIN"]), createUser);
router.put("/:id", authorize(["SUPERADMIN", "ADMIN"]), updateUser);
router.delete("/:id", authorize(["SUPERADMIN", "ADMIN"]), deleteUser);
router.patch(
  "/:id/toggle",
  authorize(["SUPERADMIN", "ADMIN"]),
  toggleUserStatus,
);

export default router;
