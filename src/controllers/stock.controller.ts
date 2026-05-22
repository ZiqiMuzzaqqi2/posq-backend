import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { AuthRequest } from "../middlewares/auth";

const prisma = new PrismaClient();

// Validation schema untuk adjust stock
const adjustStockSchema = z.object({
  productId: z.string().uuid("Product ID tidak valid"),
  branchId: z.string().uuid("Branch ID tidak valid"),
  quantity: z.number().int().positive("Quantity harus positif"),
  type: z.enum(["IN", "OUT"]),
  note: z.string().optional(),
});

// Validation schema untuk update min stock
const updateMinStockSchema = z.object({
  minStock: z.number().int().min(0, "Min stock tidak boleh negatif"),
});

/**
 * GET /api/stocks
 * Mendapatkan semua stock (dengan filter branch & product)
 */
export async function getAllStocks(req: AuthRequest, res: Response) {
  try {
    const { branchId, productId, search } = req.query;
    const { role, branchId: userBranchId } = req.user!;

    // Build filter
    let where: any = {};

    // ADMIN hanya bisa melihat stock di branch-nya sendiri
    if (role === "ADMIN") {
      where.branchId = userBranchId;
    }

    // Filter by branch (hanya untuk SUPERADMIN)
    if (branchId && role === "SUPERADMIN") {
      where.branchId = branchId as string;
    }

    // Filter by product
    if (productId) {
      where.productId = productId as string;
    }

    const stocks = await prisma.stock.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
            sellPrice: true,
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: {
        product: {
          name: "asc",
        },
      },
    });

    // Filter by search (product name or sku)
    let filteredStocks = stocks;
    if (search) {
      const searchLower = (search as string).toLowerCase();
      filteredStocks = stocks.filter(
        (stock) =>
          stock.product.name.toLowerCase().includes(searchLower) ||
          stock.product.sku.toLowerCase().includes(searchLower),
      );
    }

    return res.status(200).json({
      success: true,
      data: filteredStocks,
    });
  } catch (error) {
    console.error("Get all stocks error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

/**
 * GET /api/stocks/low-stock
 * Mendapatkan produk dengan stock di bawah min_stock
 */
export async function getLowStock(req: AuthRequest, res: Response) {
  try {
    const { role, branchId: userBranchId } = req.user!;

    let where: any = {
      quantity: {
        lt: prisma.stock.fields.minStock,
      },
    };

    // ADMIN hanya bisa melihat stock di branch-nya sendiri
    if (role === "ADMIN") {
      where.branchId = userBranchId;
    }

    const lowStocks = await prisma.stock.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
            sellPrice: true,
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: [{ quantity: "asc" }, { product: { name: "asc" } }],
    });

    return res.status(200).json({
      success: true,
      data: lowStocks,
    });
  } catch (error) {
    console.error("Get low stock error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

/**
 * GET /api/stocks/history
 * Mendapatkan history mutasi stock
 */
export async function getStockHistory(req: AuthRequest, res: Response) {
  try {
    const { productId, branchId, startDate, endDate, limit = "50" } = req.query;
    const { role, branchId: userBranchId } = req.user!;

    // Build filter
    let where: any = {};

    // ADMIN hanya bisa melihat history di branch-nya sendiri
    if (role === "ADMIN") {
      where.branchId = userBranchId;
    }

    if (productId) {
      where.productId = productId as string;
    }

    if (branchId && role === "SUPERADMIN") {
      where.branchId = branchId as string;
    }

    if (startDate) {
      where.createdAt = {
        ...where.createdAt,
        gte: new Date(startDate as string),
      };
    }

    if (endDate) {
      where.createdAt = {
        ...where.createdAt,
        lte: new Date(endDate as string),
      };
    }

    const mutations = await prisma.stockMutation.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: parseInt(limit as string),
    });

    return res.status(200).json({
      success: true,
      data: mutations,
    });
  } catch (error) {
    console.error("Get stock history error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

/**
 * POST /api/stocks/adjust
 * Adjust stock (tambah/kurang stok)
 */
export async function adjustStock(req: AuthRequest, res: Response) {
  try {
    const validatedData = adjustStockSchema.parse(req.body);
    const { id: userId, name: userName } = req.user!;

    // Cek apakah stock exists
    let stock = await prisma.stock.findUnique({
      where: {
        productId_branchId: {
          productId: validatedData.productId,
          branchId: validatedData.branchId,
        },
      },
    });

    if (!stock) {
      // Jika stock belum ada, buat baru dengan quantity 0
      stock = await prisma.stock.create({
        data: {
          productId: validatedData.productId,
          branchId: validatedData.branchId,
          quantity: 0,
          minStock: 5,
        },
      });
    }

    const beforeStock = stock.quantity;
    let afterStock = beforeStock;
    const adjustmentQuantity = validatedData.quantity;

    if (validatedData.type === "IN") {
      afterStock = beforeStock + adjustmentQuantity;
    } else {
      afterStock = beforeStock - adjustmentQuantity;
      // Cek apakah stok mencukupi
      if (afterStock < 0) {
        return res.status(400).json({
          success: false,
          message: `Stock tidak mencukupi. Stock saat ini: ${beforeStock}`,
        });
      }
    }

    // Update stock
    const updatedStock = await prisma.stock.update({
      where: { id: stock.id },
      data: { quantity: afterStock },
    });

    // Create mutation history
    const mutation = await prisma.stockMutation.create({
      data: {
        productId: validatedData.productId,
        branchId: validatedData.branchId,
        type: validatedData.type,
        quantity: adjustmentQuantity,
        beforeStock,
        afterStock,
        referenceId: userId,
        referenceType: "ADJUSTMENT",
        note: validatedData.note || `Adjusted by ${userName}`,
      },
    });

    return res.status(200).json({
      success: true,
      message: `Stock ${validatedData.type === "IN" ? "increased" : "decreased"} successfully`,
      data: {
        stock: updatedStock,
        mutation,
      },
    });
  } catch (error) {
    console.error("Adjust stock error:", error);

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
 * PUT /api/stocks/:id/min-stock
 * Update minimum stock alert
 */
export async function updateMinStock(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params as { id: string };
    const validatedData = updateMinStockSchema.parse(req.body);

    const stock = await prisma.stock.findUnique({
      where: { id },
    });

    if (!stock) {
      return res.status(404).json({
        success: false,
        message: "Stock not found",
      });
    }

    const updatedStock = await prisma.stock.update({
      where: { id },
      data: { minStock: validatedData.minStock },
    });

    return res.status(200).json({
      success: true,
      message: "Minimum stock updated successfully",
      data: updatedStock,
    });
  } catch (error) {
    console.error("Update min stock error:", error);

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
 * GET /api/stocks/:id
 * Mendapatkan detail stock
 */
export async function getStockById(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params as { id: string };
    const { role, branchId: userBranchId } = req.user!;

    const stock = await prisma.stock.findUnique({
      where: { id },
      include: {
        product: {
          include: {
            category: true,
          },
        },
        branch: true,
      },
    });

    if (!stock) {
      return res.status(404).json({
        success: false,
        message: "Stock not found",
      });
    }

    // ADMIN hanya bisa melihat stock di branch-nya sendiri
    if (role === "ADMIN" && stock.branchId !== userBranchId) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    return res.status(200).json({
      success: true,
      data: stock,
    });
  } catch (error) {
    console.error("Get stock by id error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
