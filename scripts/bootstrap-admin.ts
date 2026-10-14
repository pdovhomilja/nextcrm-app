/**
 * Ensures the bootstrap admin user + password exist (uses DATABASE_URL from .env).
 * Run against production once after deploy: pnpm bootstrap:admin
 */
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "path";

import {
  preparePgPoolConnectionString,
  resolveMigrateDatabaseUrl,
  resolvePgSslConfig,
  resolveRuntimeDatabaseUrl,
} from "@/lib/database-url";
import { seedBootstrapAdmin } from "@/prisma/seeds/bootstrap-admin";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

function resolveBootstrapDatabaseUrl(): string {
  const explicit = process.env.DATABASE_URL?.trim();
  if (explicit) return explicit;
  try {
    return resolveRuntimeDatabaseUrl();
  } catch {
    return resolveMigrateDatabaseUrl();
  }
}

async function main() {
  if (process.env.BOOTSTRAP_ADMIN_SKIP === "1") {
    console.log("[bootstrap-admin] Skipped (BOOTSTRAP_ADMIN_SKIP=1)");
    return;
  }

  const raw = resolveBootstrapDatabaseUrl();
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
