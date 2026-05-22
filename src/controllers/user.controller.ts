// ============================================
// CONTROLLER USER MANAGEMENT
// ============================================
import { Response } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { AuthRequest } from "../middlewares/auth";
import { hashPassword } from "../utils/password";

// Validation schema untuk create/update user
const userSchema = z.object({
  email: z.string().email("Email tidak valid"),
  name: z.string().min(2, "Nama minimal 2 karakter"),
  role: z.enum(["SUPERADMIN", "ADMIN", "MANAGER", "KASIR", "GUDANG"]),
  branchId: z.string().uuid("Branch ID tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter").optional(),
  isActive: z.boolean().default(true),
});

const updateUserSchema = z.object({
  email: z.string().email("Email tidak valid").optional(),
  name: z.string().min(2, "Nama minimal 2 karakter").optional(),
  role: z
    .enum(["SUPERADMIN", "ADMIN", "MANAGER", "KASIR", "GUDANG"])
    .optional(),
  branchId: z.string().uuid("Branch ID tidak valid").optional(),
  password: z.string().min(6, "Password minimal 6 karakter").optional(),
  isActive: z.boolean().optional(),
});

/**
 * GET /api/users
 * Mendapatkan semua user
 * SUPERADMIN: semua user
 * ADMIN: hanya user di branch-nya sendiri
 */
export async function getAllUsers(req: AuthRequest, res: Response) {
  try {
    const { role, branchId } = req.user!;
    const { search, branch, status } = req.query;

    // Build filter
    let where: any = {};

    // ADMIN hanya bisa melihat user di branch-nya sendiri
    if (role === "ADMIN") {
      where.branchId = branchId;
    }

    // Filter by branch
    if (branch && role === "SUPERADMIN") {
      where.branchId = branch as string;
    }

    // Filter by status
    if (status === "active") {
      where.isActive = true;
    } else if (status === "inactive") {
      where.isActive = false;
    }

    // Filter by search (name or email)
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: "insensitive" } },
        { email: { contains: search as string, mode: "insensitive" } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        branchId: true,
        isActive: true,
        createdAt: true,
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("Get all users error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

/**
 * GET /api/users/:id
 * Mendapatkan detail user
 */
export async function getUserById(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params as { id: string };
    const { role, branchId } = req.user!;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        branchId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
            address: true,
            phone: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ADMIN hanya bisa melihat user di branch-nya sendiri
    if (role === "ADMIN" && user.branchId !== branchId) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Get user by id error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

/**
 * POST /api/users
 * Membuat user baru
 * SUPERADMIN: bisa buat user untuk cabang manapun
 * ADMIN: hanya bisa buat user untuk branch-nya sendiri dengan role selain SUPERADMIN
 */
export async function createUser(req: AuthRequest, res: Response) {
  try {
    const { role: currentUserRole, branchId: currentUserBranchId } = req.user!;
    const validatedData = userSchema.parse(req.body);

    // ADMIN tidak bisa membuat SUPERADMIN
    if (currentUserRole === "ADMIN" && validatedData.role === "SUPERADMIN") {
      return res.status(403).json({
        success: false,
        message: "ADMIN cannot create SUPERADMIN user",
      });
    }

    // ADMIN hanya bisa membuat user untuk branch-nya sendiri
    if (
      currentUserRole === "ADMIN" &&
      validatedData.branchId !== currentUserBranchId
    ) {
      return res.status(403).json({
        success: false,
        message: "ADMIN can only create users for their own branch",
      });
    }

    // Cek apakah email sudah terdaftar
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    // Cek apakah branch exists
    const branch = await prisma.branch.findUnique({
      where: { id: validatedData.branchId },
    });

    if (!branch) {
      return res.status(400).json({
        success: false,
        message: "Branch not found",
      });
    }

    // Hash password (gunakan default password jika tidak disediakan)
    const plainPassword = validatedData.password || "password123";
    const hashedPassword = await hashPassword(plainPassword);

    // Buat user baru
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        password: hashedPassword,
        name: validatedData.name,
        role: validatedData.role,
        branchId: validatedData.branchId,
        isActive: validatedData.isActive,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        branchId: true,
        isActive: true,
        createdAt: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        ...user,
        temporaryPassword: !validatedData.password ? "password123" : undefined,
      },
    });
  } catch (error) {
    console.error("Create user error:", error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.issues,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

/**
 * PUT /api/users/:id
 * Update user
 */
export async function updateUser(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params as { id: string };
    const { role: currentUserRole, branchId: currentUserBranchId } = req.user!;
    const validatedData = updateUserSchema.parse(req.body);

    // Cek apakah user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ADMIN tidak bisa mengedit user di branch lain
    if (
      currentUserRole === "ADMIN" &&
      existingUser.branchId !== currentUserBranchId
    ) {
      return res.status(403).json({
        success: false,
        message: "ADMIN can only edit users in their own branch",
      });
    }

    // ADMIN tidak bisa mengubah role user menjadi SUPERADMIN
    if (currentUserRole === "ADMIN" && validatedData.role === "SUPERADMIN") {
      return res.status(403).json({
        success: false,
        message: "ADMIN cannot change role to SUPERADMIN",
      });
    }

    // Jika update email, cek duplikasi
    if (validatedData.email && validatedData.email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: validatedData.email },
      });

      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: "Email already registered",
        });
      }
    }

    // Jika update branchId, cek apakah branch exists
    if (validatedData.branchId) {
      const branch = await prisma.branch.findUnique({
        where: { id: validatedData.branchId },
      });

      if (!branch) {
        return res.status(400).json({
          success: false,
          message: "Branch not found",
        });
      }
    }

    // Prepare update data
    const updateData: any = { ...validatedData };

    // If password is provided, hash it
    if (validatedData.password) {
      updateData.password = await hashPassword(validatedData.password);
    }

    // Update user
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        branchId: true,
        isActive: true,
        createdAt: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: user,
    });
  } catch (error) {
    console.error("Update user error:", error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.issues,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

/**
 * DELETE /api/users/:id
 * Hapus user (soft delete dengan mengubah isActive = false)
 */
export async function deleteUser(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params as { id: string };
    const {
      role: currentUserRole,
      branchId: currentUserBranchId,
      id: currentUserId,
    } = req.user!;

    // Cek apakah user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Tidak bisa menghapus diri sendiri
    if (existingUser.id === currentUserId) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account",
      });
    }

    // ADMIN tidak bisa menghapus user di branch lain
    if (
      currentUserRole === "ADMIN" &&
      existingUser.branchId !== currentUserBranchId
    ) {
      return res.status(403).json({
        success: false,
        message: "ADMIN can only delete users in their own branch",
      });
    }

    // Soft delete (set isActive = false)
    const user = await prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        branchId: true,
        isActive: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "User deactivated successfully",
      data: user,
    });
  } catch (error) {
    console.error("Delete user error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

/**
 * PATCH /api/users/:id/toggle
 * Aktifkan/Nonaktifkan user
 */
export async function toggleUserStatus(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params as { id: string };
    const {
      role: currentUserRole,
      branchId: currentUserBranchId,
      id: currentUserId,
    } = req.user!;

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Tidak bisa menonaktifkan diri sendiri
    if (user.id === currentUserId) {
      return res.status(400).json({
        success: false,
        message: "You cannot deactivate your own account",
      });
    }

    // ADMIN tidak bisa mengubah status user di branch lain
    if (currentUserRole === "ADMIN" && user.branchId !== currentUserBranchId) {
      return res.status(403).json({
        success: false,
        message: "ADMIN can only manage users in their own branch",
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        branchId: true,
        isActive: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: `User ${updatedUser.isActive ? "activated" : "deactivated"} successfully`,
      data: updatedUser,
    });
  } catch (error) {
    console.error("Toggle user status error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
