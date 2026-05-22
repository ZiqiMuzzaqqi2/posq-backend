import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("Missing required environment variable DATABASE_URL");
}

// Standar PrismaClient (tanpa adapter)
const prisma = new PrismaClient();

export { prisma };
export default prisma;
