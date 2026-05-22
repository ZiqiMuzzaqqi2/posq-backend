import winston from "winston";
import path from "path";
import fs from "fs";

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors
const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "white",
};

winston.addColors(colors);

// Define format
const format = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) =>
      `${info.timestamp} ${info.level}: ${info.message}${
        info.stack ? "\n" + info.stack : ""
      }`
  )
);

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console(),

  // Error log file
  new winston.transports.File({
    filename: path.join(logsDir, "error.log"),
    level: "error",
    format: winston.format.combine(
      winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
      winston.format.printf(
        (info) =>
          `${info.timestamp} ${info.level}: ${info.message}${
            info.stack ? "\n" + info.stack : ""
          }`
      )
    ),
  }),

  // All logs file
  new winston.transports.File({
    filename: path.join(logsDir, "all.log"),
    format: winston.format.combine(
      winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
      winston.format.printf(
        (info) =>
          `${info.timestamp} ${info.level}: ${info.message}${
            info.stack ? "\n" + info.stack : ""
          }`
      )
    ),
  }),

  // HTTP logs file
  new winston.transports.File({
    filename: path.join(logsDir, "http.log"),
    level: "http",
    format: winston.format.combine(
      winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
      winston.format.printf((info) => `${info.timestamp} ${info.message}`)
    ),
  }),
];

// Create logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "debug",
  levels,
  format,
  transports,
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, "exceptions.log"),
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, "rejections.log"),
    }),
  ],
});

export default logger;
