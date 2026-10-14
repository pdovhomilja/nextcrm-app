/**
 * Ensures the bootstrap admin user + password exist (uses DATABASE_URL from .env).
 * Run against production once after deploy: pnpm bootstrap:admin
 */
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "path";

import { preparePgPoolConnectionString, resolvePgSslConfig } from "@/lib/database-url";
import { seedBootstrapAdmin } from "@/prisma/seeds/bootstrap-admin";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) {
    throw new Error("DATABASE_URL is not set (use .env or export it).");
  }
  const connectionString = preparePgPoolConnectionString(raw);
  const ssl = resolvePgSslConfig(raw);
  const pool = new Pool({
    connectionString,
    ...(ssl !== undefined ? { ssl } : {}),
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    await seedBootstrapAdmin(prisma);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
