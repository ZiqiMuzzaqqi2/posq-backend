import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";
import { v4 as uuidv4 } from "uuid";

// Add request ID to each request for tracking
export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  (req as any).id = uuidv4();
  next();
};

// Log HTTP requests
export const httpLoggerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const requestId = (req as any).id;
  const startTime = Date.now();

  // Log request details
  logger.http(
    `[${requestId}] ${req.method} ${req.originalUrl} - IP: ${
      req.ip || "unknown"
    }`
  );

  // Track response
  const originalSend = res.send;
  res.send = function (data) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Log response details
    logger.http(
      `[${requestId}] Response ${statusCode} - ${duration}ms - ${req.method} ${req.originalUrl}`
    );

    return originalSend.call(this, data);
  };

  next();
};

// Error handling middleware
export const errorHandlerMiddleware = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const requestId = (req as any).id;
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  // Log error with stack trace
  logger.error(
    `[${requestId}] Error: ${message} - Status: ${statusCode}`,
    {
      stack: err.stack,
      method: req.method,
      url: req.originalUrl,
      body: req.body,
      params: req.params,
      query: req.query,
    }
  );

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      message,
      requestId,
      timestamp: new Date().toISOString(),
    },
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

// 404 handler
export const notFoundMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const requestId = (req as any).id;
  logger.warn(`[${requestId}] 404 Not Found - ${req.method} ${req.originalUrl}`);

  res.status(404).json({
    success: false,
    error: {
      message: "Route not found",
      requestId,
      timestamp: new Date().toISOString(),
    },
  });
};

// Async error handler wrapper
export const asyncHandler =
  (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      const requestId = (req as any).id;
      logger.error(`[${requestId}] Async Error: ${err.message}`, {
        stack: err.stack,
        method: req.method,
        url: req.originalUrl,
      });
      next(err);
    });
  };
