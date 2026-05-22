// ============================================
// CONTROLLER BRANCH (Cabang/Toko)
// ============================================
import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { AuthRequest } from "../middlewares/auth";

// Validation schema untuk create/update branch
const branchSchema = z.object({
  name: z.string().min(2, "Nama cabang minimal 2 karakter"),
  code: z.string().min(2, "Kode cabang minimal 2 karakter"),
  address: z.string().optional(),
  phone: z.string().optional(),
  isActive: z.boolean().default(true),
});

/**
 * GET /api/branches
 * Mendapatkan semua cabang
 * Akses: SUPERADMIN, ADMIN
 */
export async function getAllBranches(req: AuthRequest, res: Response) {
  try {
    const branches = await prisma.branch.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: branches,
    });
  } catch (error) {
    console.error("Get all branches error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

/**
 * GET /api/branches/:id
 * Mendapatkan detail cabang
 * Akses: SUPERADMIN, ADMIN
 */
export async function getBranchById(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params as { id: string };

    const branch = await prisma.branch.findUnique({
      where: { id } ,
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
          },
        },
        _count: {
          select: { users: true },
        },
      },
    });

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: branch,
    });
  } catch (error) {
    console.error("Get branch by id error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

/**
 * POST /api/branches
 * Membuat cabang baru
 * Akses: SUPERADMIN only
 */
export async function createBranch(req: AuthRequest, res: Response) {
  try {
    // Validasi input
    const validatedData = branchSchema.parse(req.body);

    // Cek apakah kode cabang sudah ada
    const existingBranch = await prisma.branch.findUnique({
      where: { code: validatedData.code },
    });

    if (existingBranch) {
      return res.status(400).json({
        success: false,
        message: "Branch code already exists",
      });
    }

    // Buat cabang baru
    const branch = await prisma.branch.create({
      data: {
        name: validatedData.name,
        code: validatedData.code,
        address: validatedData.address || null,
        phone: validatedData.phone || null,
        isActive: validatedData.isActive,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Branch created successfully",
      data: branch,
    });
  } catch (error) {
    console.error("Create branch error:", error);

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
 * PUT /api/branches/:id
 * Update cabang
 * Akses: SUPERADMIN only
 */
export async function updateBranch(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params as { id: string };
    const validatedData = branchSchema.partial().parse(req.body);

    // Cek apakah branch exists
    const existingBranch = await prisma.branch.findUnique({
      where: { id },
    });

    if (!existingBranch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found",
      });
    }

    // Jika update code, cek duplikasi
    if (validatedData.code && validatedData.code !== existingBranch.code) {
      const codeExists = await prisma.branch.findUnique({
        where: { code: validatedData.code },
      });

      if (codeExists) {
        return res.status(400).json({
          success: false,
          message: "Branch code already exists",
        });
      }
    }

    // Update branch
    const branch = await prisma.branch.update({
      where: { id },
      data: validatedData,
    });

    return res.status(200).json({
      success: true,
      message: "Branch updated successfully",
      data: branch,
    });
  } catch (error) {
    console.error("Update branch error:", error);

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
 * DELETE /api/branches/:id
 * Hapus cabang (soft delete dengan mengubah isActive = false)
 * Akses: SUPERADMIN only
 */
export async function deleteBranch(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params as { id: string };

    // Cek apakah branch exists
    const existingBranch = await prisma.branch.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!existingBranch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found",
      });
    }

    // Jika branch memiliki user, tidak bisa dihapus
    if (existingBranch._count.users > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete branch with existing users. Deactivate instead.",
      });
    }

    // Hapus branch (hard delete karena tidak ada relasi)
    await prisma.branch.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: "Branch deleted successfully",
    });
  } catch (error) {
    console.error("Delete branch error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

/**
 * PATCH /api/branches/:id/toggle
 * Aktifkan/Nonaktifkan cabang
 * Akses: SUPERADMIN only
 */
export async function toggleBranchStatus(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params as { id: string };

    const branch = await prisma.branch.findUnique({
      where: { id },
    });

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found",
      });
    }

    const updatedBranch = await prisma.branch.update({
      where: { id },
      data: { isActive: !branch.isActive },
    });

    return res.status(200).json({
      success: true,
      message: `Branch ${updatedBranch.isActive ? "activated" : "deactivated"} successfully`,
      data: updatedBranch,
    });
  } catch (error) {
    console.error("Toggle branch status error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
