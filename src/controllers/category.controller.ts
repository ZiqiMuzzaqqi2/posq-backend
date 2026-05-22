// ============================================
// CONTROLLER CATEGORY
// ============================================
import { Response } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { AuthRequest } from "../middlewares/auth";

// Validation schema untuk category
const categorySchema = z.object({
  name: z.string().min(2, "Nama kategori minimal 2 karakter"),
  description: z.string().optional(),
});

/**
 * GET /api/categories
 * Mendapatkan semua kategori
 */
export async function getAllCategories(req: AuthRequest, res: Response) {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("Get all categories error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

/**
 * GET /api/categories/:id
 * Mendapatkan detail kategori
 */
export async function getCategoryById(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params as { id: string };

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        products: {
          select: {
            id: true,
            name: true,
            sku: true,
            sellPrice: true,
          },
        },
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error("Get category by id error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

/**
 * POST /api/categories
 * Membuat kategori baru
 * Akses: SUPERADMIN, ADMIN
 */
export async function createCategory(req: AuthRequest, res: Response) {
  try {
    const validatedData = categorySchema.parse(req.body);

    // Cek apakah nama kategori sudah ada
    const existingCategory = await prisma.category.findUnique({
      where: { name: validatedData.name },
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: "Category name already exists",
      });
    }

    const category = await prisma.category.create({
      data: {
        name: validatedData.name,
        description: validatedData.description || null,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category,
    });
  } catch (error) {
    console.error("Create category error:", error);

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
 * PUT /api/categories/:id
 * Update kategori
 * Akses: SUPERADMIN, ADMIN
 */
export async function updateCategory(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params as { id: string };
    const validatedData = categorySchema.partial().parse(req.body);

    const existingCategory = await prisma.category.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Jika update name, cek duplikasi
    if (validatedData.name && validatedData.name !== existingCategory.name) {
      const nameExists = await prisma.category.findUnique({
        where: { name: validatedData.name },
      });

      if (nameExists) {
        return res.status(400).json({
          success: false,
          message: "Category name already exists",
        });
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data: validatedData,
    });

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: category,
    });
  } catch (error) {
    console.error("Update category error:", error);

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
 * DELETE /api/categories/:id
 * Hapus kategori
 * Akses: SUPERADMIN, ADMIN
 */
export async function deleteCategory(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params as { id: string };

    const existingCategory = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Jika kategori memiliki products, tidak bisa dihapus
    if (existingCategory._count.products > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete category with existing products. Move or delete products first.",
      });
    }

    await prisma.category.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Delete category error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
