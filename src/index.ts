import express from "express";
import dotenv from "dotenv";

// Load environment variables first
dotenv.config();

import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { prisma } from "./prisma";

import authRoute from "../src/routes/auth.route";
import branchRoute from "../src/routes/branch.route";
import userRoute from "../src/routes/user.route";
import categoryRoute from "../src/routes/category.route";
import productRoute from "../src/routes/product.route";

const app = express();

// Test database connection
async function testDatabaseConnection() {
  try {
    await prisma.$connect();
    console.log("✅ Database connected successfully");
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    return false;
  }
}

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================
// API ROUTES
// ============================================
app.use("/api/auth", authRoute);
app.use("/api/branches", branchRoute);
app.use("/api/users", userRoute);
app.use("/api/categories", categoryRoute);
app.use("/api/products", productRoute);

// ============================================
// PUBLIC ENDPOINTS
// ============================================

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date(),
    service: "PosQ Backend",
    version: "1.0.0",
  });
});

app.get("/", (req, res) => {
  res.json({
    message: "Welcome to PosQ API",
    endpoints: {
      health: "GET /health",
      dbTest: "GET /db-test",
      auth: {
        register: "POST /api/auth/register",
        login: "POST /api/auth/login",
        me: "GET /api/auth/me (need token)",
        logout: "POST /api/auth/logout (need token)",
      },
    },
  });
});

app.get("/db-test", async (req, res) => {
  try {
    const branchCount = await prisma.branch.count();
    res.json({
      success: true,
      message: "Database connected!",
      branchCount: branchCount,
      database: "PostgreSQL",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

const PORT = process.env.PORT || 8000;

testDatabaseConnection().then((dbConnected) => {
  app.listen(PORT, () => {
    console.log("");
    console.log("=".repeat(50));
    console.log("🚀 PosQ Backend Server Started");
    console.log("=".repeat(50));
    console.log(`📡 Server running on: http://localhost:${PORT}`);
    console.log(`❤️  Health check: http://localhost:${PORT}/health`);
    console.log(`🔐 Auth API: http://localhost:${PORT}/api/auth`);
    console.log(
      `💾 Database status: ${dbConnected ? "CONNECTED ✅" : "FAILED ❌"}`,
    );
    console.log("=".repeat(50));
    console.log("");
  });
});
