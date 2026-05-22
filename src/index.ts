import express from "express";
import dotenv from "dotenv";

// Load environment variables first
dotenv.config();

import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { prisma } from "./prisma";
import { logger } from "./utils/logger";
import {
  requestIdMiddleware,
  httpLoggerMiddleware,
  errorHandlerMiddleware,
  notFoundMiddleware,
} from "./middlewares/logger.middleware";

import authRoute from "../src/routes/auth.route";
import branchRoute from "../src/routes/branch.route";
import userRoute from "../src/routes/user.route";
import categoryRoute from "../src/routes/category.route";
import productRoute from "../src/routes/product.route";

import uploadRoute from "../src/routes/upload.route";

const app = express();

// Test database connection
async function testDatabaseConnection() {
  try {
    await prisma.$connect();
    logger.info("✅ Database connected successfully");
    return true;
  } catch (error) {
    logger.error("❌ Database connection failed:", { error });
    return false;
  }
}

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use(requestIdMiddleware);
app.use(httpLoggerMiddleware);

// Static file serving for uploaded images
app.use(
  "/uploads",
  (req, res, next) => {
    // Tambahkan CORS headers untuk file statis
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader(
      "Access-Control-Allow-Origin",
      process.env.CLIENT_URL || "http://localhost:5173",
    );
    res.setHeader("Access-Control-Allow-Methods", "GET");
    next();
  },
  express.static(path.join(__dirname, "../uploads")),
);

// ============================================
// API ROUTES
// ============================================
app.use("/api/auth", authRoute);
app.use("/api/branches", branchRoute);
app.use("/api/users", userRoute);
app.use("/api/categories", categoryRoute);
app.use("/api/products", productRoute);

app.use("/api/upload", uploadRoute);

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
  const requestId = (req as any).id;
  try {
    const branchCount = await prisma.branch.count();
    logger.info(
      `[${requestId}] Database test successful - Branch count: ${branchCount}`,
    );
    res.json({
      success: true,
      message: "Database connected!",
      branchCount: branchCount,
      database: "PostgreSQL",
    });
  } catch (error) {
    logger.error(`[${requestId}] Database test failed`, { error });
    res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// 404 handler
app.use(notFoundMiddleware);

// Error handling middleware (must be last)
app.use(errorHandlerMiddleware);

const PORT = process.env.PORT || 8000;

testDatabaseConnection().then((dbConnected) => {
  app.listen(PORT, () => {
    const message = `
${"=".repeat(50)}
🚀 PosQ Backend Server Started
${"=".repeat(50)}
📡 Server running on: http://localhost:${PORT}
❤️  Health check: http://localhost:${PORT}/health
🔐 Auth API: http://localhost:${PORT}/api/auth
💾 Database status: ${dbConnected ? "CONNECTED ✅" : "FAILED ❌"}
${"=".repeat(50)}
`;
    logger.info(message);
    console.log(message);
  });
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", { error });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection:", { reason, promise });
});
