// ============================================
// SEEDER - MEMBUAT DATA AWAL
// ============================================
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("Missing required environment variable DATABASE_URL");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: DATABASE_URL,
  }),
});

async function main() {
  console.log("🌱 Seeding database...");

  // 1. Buat cabang (branch) pertama
  const branch1 = await prisma.branch.upsert({
    where: { code: "HQ01" },
    update: {},
    create: {
      name: "Cabang Pusat Jakarta",
      code: "HQ01",
      address: "Jl. Sudirman No. 123, Jakarta",
      phone: "021-1234567",
      isActive: true,
    },
  });

  const branch2 = await prisma.branch.upsert({
    where: { code: "CBG02" },
    update: {},
    create: {
      name: "Cabang Bandung",
      code: "CBG02",
      address: "Jl. Asia Afrika No. 45, Bandung",
      phone: "022-7654321",
      isActive: true,
    },
  });

  console.log(`✅ Created branches: ${branch1.name}, ${branch2.name}`);

  // 2. Buat user SUPERADMIN
  const hashedPassword = await bcrypt.hash("admin123", 10);

  const superadmin = await prisma.user.upsert({
    where: { email: "superadmin@posq.com" },
    update: {},
    create: {
      email: "superadmin@posq.com",
      password: hashedPassword,
      name: "Super Administrator",
      role: "SUPERADMIN",
      branchId: branch1.id,
      isActive: true,
    },
  });

  console.log(
    `✅ Created SUPERADMIN: ${superadmin.email} (password: admin123)`,
  );

  // 3. Buat user ADMIN untuk cabang 1
  const admin1 = await prisma.user.upsert({
    where: { email: "admin@jakarta.posq.com" },
    update: {},
    create: {
      email: "admin@jakarta.posq.com",
      password: hashedPassword,
      name: "Admin Jakarta",
      role: "ADMIN",
      branchId: branch1.id,
      isActive: true,
    },
  });

  console.log(`✅ Created ADMIN: ${admin1.email} (password: admin123)`);

  // 4. Buat user KASIR untuk cabang 1
  const kasir1 = await prisma.user.upsert({
    where: { email: "kasir@jakarta.posq.com" },
    update: {},
    create: {
      email: "kasir@jakarta.posq.com",
      password: hashedPassword,
      name: "Kasir Jakarta",
      role: "KASIR",
      branchId: branch1.id,
      isActive: true,
    },
  });

  console.log(`✅ Created KASIR: ${kasir1.email} (password: admin123)`);

  console.log("🌱 Seeding completed!");
  console.log("");
  console.log("📝 Login Credentials:");
  console.log("   SUPERADMIN: superadmin@posq.com / admin123");
  console.log("   ADMIN: admin@jakarta.posq.com / admin123");
  console.log("   KASIR: kasir@jakarta.posq.com / admin123");
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
