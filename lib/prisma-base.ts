import { PrismaClient } from "@prisma/client";
import { Pool, type PoolConfig } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  var cachedPrisma: PrismaClient | undefined;
  var cachedPgPool: Pool | undefined;
}

function resolveDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  if (process.env.NODE_ENV === "production" && url.includes("prisma_migration")) {
    console.error(
      "[prisma] DATABASE_URL uses the prisma_migration role. Use your app/pooled URL at runtime and set DIRECT_DATABASE_URL for migrations only."
    );
  }
  return url;
}

function poolConfig(connectionString: string): PoolConfig {
  const isServerless = process.env.VERCEL === "1" || process.env.AWS_LAMBDA_FUNCTION_NAME;
  const max = Number.parseInt(process.env.PG_POOL_MAX ?? (isServerless ? "2" : "10"), 10);
  return {
    connectionString,
    max: Number.isFinite(max) && max > 0 ? max : 2,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 10_000,
  };
}

const prismaClientSingleton = () => {
  const connectionString = resolveDatabaseUrl();
  const pool = global.cachedPgPool ?? new Pool(poolConfig(connectionString));
  if (!global.cachedPgPool) {
    global.cachedPgPool = pool;
  }
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
};

export const prismaBase = global.cachedPrisma ?? prismaClientSingleton();
global.cachedPrisma = prismaBase;
