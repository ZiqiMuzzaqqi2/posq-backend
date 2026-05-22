import { z } from "zod";
import { ro } from "zod/v4/locales";

// Validasi untuk register
export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  role: z
    .enum(["SUPERADMIN", "ADMIN", "MANAGER", "KASIR", "GUDANG"])
    .default("KASIR"),
  branchId: z.string().uuid("Invalid branch ID format"),
});

// Validasi untuk login
export const loginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
})

// Export type untuk input register dan login
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;