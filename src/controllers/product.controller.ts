// ============================================
// CONTROLLER PRODUCT
// ============================================
import { Response } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { AuthRequest } from "../middlewares/auth";

// Validation schema untuk product
const productSchema = z.object({
  sku: z.string().min(2, "SKU minimal 2 karakter"),
  name: z.string().min(2, "Nama produk minimal 2 karakter"),
  description: z.string().optional(),
  buyPrice: z.number().positive("Harga beli harus positif"),
  sellPrice: z.number().positive("Harga jual harus positif"),
  categoryId: z.string().uuid("Category ID tidak valid"),
  imageUrl: z.string().url("URL gambar tidak valid").optional(),
  isActive: z.boolean().default(true),
});

/**
 * GET /api/products
 * Mendapatkan semua products (dengan filter)
 */
export async function getAllProducts(req: AuthRequest, res: Response) {
  try {
    const { search, category, status, branchId } = req.query;
    const { role, branchId: userBranchId } = req.user!;

    // Build filter
    let where: any = {};

    // Filter by search (name or sku)
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: "insensitive" } },
        { sku: { contains: search as string, mode: "insensitive" } },
      ];
    }

    // Filter by category
    if (category) {
      where.categoryId = category as string;
    }

    // Filter by status
    if (status === "active") {
      where.isActive = true;
    } else if (status === "inactive") {
      where.isActive = false;
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        stocks: {
          where: branchId
            ? { branchId: branchId as string }
            : role === "ADMIN"
              ? { branchId: userBranchId }
              : undefined,
          select: {
            quantity: true,
            minStock: true,
            branch: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error("Get all products error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

/**
 * GET /api/products/:id
 * Mendapatkan detail product
 */
export async function getProductById(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params as { id: string };
    const { role, branchId: userBranchId } = req.user!;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        stocks: {
          where: role === "ADMIN" ? { branchId: userBranchId } : undefined,
          include: {
            branch: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("Get product by id error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

/**
 * POST /api/products
 * Membuat product baru
 * Akses: SUPERADMIN, ADMIN, MANAGER, GUDANG
 */
export async function createProduct(req: AuthRequest, res: Response) {
  try {
    const validatedData = productSchema.parse(req.body);
    const { branchId } = req.user!;

    // Cek apakah SKU sudah ada
    const existingProduct = await prisma.product.findUnique({
      where: { sku: validatedData.sku },
    });

    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: "Product SKU already exists",
      });
    }

    // Cek apakah category exists
    const category = await prisma.category.findUnique({
      where: { id: validatedData.categoryId },
    });

    if (!category) {
      return res.status(400).json({
        success: false,
        message: "Category not found",
      });
    }

    // Buat product
    const product = await prisma.product.create({
      data: {
        sku: validatedData.sku,
        name: validatedData.name,
        description: validatedData.description || null,
        buyPrice: validatedData.buyPrice,
        sellPrice: validatedData.sellPrice,
        categoryId: validatedData.categoryId,
        imageUrl: validatedData.imageUrl || null,
        isActive: validatedData.isActive,
      },
    });

    // Buat stock entry untuk semua branches yang aktif
    const activeBranches = await prisma.branch.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    for (const branch of activeBranches) {
      await prisma.stock.create({
        data: {
          productId: product.id,
          branchId: branch.id,
          quantity: 0,
          minStock: 5,
        },
      });
    }

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    console.error("Create product error:", error);

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
 * PUT /api/products/:id
 * Update product
 * Akses: SUPERADMIN, ADMIN, MANAGER, GUDANG
 */
export async function updateProduct(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params as { id: string };
    const validatedData = productSchema.partial().parse(req.body);

    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Jika update SKU, cek duplikasi
    if (validatedData.sku && validatedData.sku !== existingProduct.sku) {
      const skuExists = await prisma.product.findUnique({
        where: { sku: validatedData.sku },
      });

      if (skuExists) {
        return res.status(400).json({
          success: false,
          message: "Product SKU already exists",
        });
      }
    }

    // Jika update categoryId, cek apakah category exists
    if (validatedData.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: validatedData.categoryId },
      });

      if (!category) {
        return res.status(400).json({
          success: false,
          message: "Category not found",
        });
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: validatedData,
    });

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: product,
    });
  } catch (error) {
    console.error("Update product error:", error);

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
 * DELETE /api/products/:id
 * Hapus product (soft delete dengan mengubah isActive = false)
 * Akses: SUPERADMIN, ADMIN
 */
export async function deleteProduct(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params as { id: string };

    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Soft delete (set isActive = false)
    const product = await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    return res.status(200).json({
      success: true,
      message: "Product deactivated successfully",
      data: product,
    });
  } catch (error) {
    console.error("Delete product error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

/**
 * PATCH /api/products/:id/toggle
 * Aktifkan/Nonaktifkan product
 */
export async function toggleProductStatus(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params as { id: string };

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: { isActive: !product.isActive },
    });

    return res.status(200).json({
      success: true,
      message: `Product ${updatedProduct.isActive ? "activated" : "deactivated"} successfully`,
      data: updatedProduct,
    });
  } catch (error) {
    console.error("Toggle product status error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
