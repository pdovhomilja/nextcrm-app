import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { resolveRuntimeDatabaseUrl } from "@/lib/db/runtime-database-url";

declare global {
  var cachedPrisma: PrismaClient | undefined;
}

// Prisma Client configuration with connection pooling and lifecycle management
const prismaClientSingleton = () => {
  // Runtime connects through the transaction pooler (RUNTIME_DATABASE_URL) when
  // set, else falls back to DATABASE_URL (the session pooler that migrations use).
  // See lib/db/runtime-database-url.ts and SUPABASE_ON_VERCEL.md §3.
  const connectionString = resolveRuntimeDatabaseUrl();
  // Cap connections per function instance so a cold-start fan-out (or prerender)
  // can't exhaust the Supabase session-mode pooler (pool_size 15) and take down
  // every route with (EMAXCONNSESSION) / better-auth FAILED_TO_GET_SESSION.
  // Default 3; never 1 (a 1-connection pool deadlocks multi-query renders).
  // See docs/guides/platform/SUPABASE_ON_VERCEL.md §3.
  // `|| 3` (not `?? 3`) is deliberate: an empty-string or non-numeric env value
  // coerces to 0/NaN, and pg treats a falsy `max` as its default of 10 — which
  // would silently re-create the exhaustion. Collapse anything invalid to 3.
  const pool = new Pool({
    connectionString,
    max: Number(process.env.DB_POOL_MAX) || 3,
  });
  // Supavisor reaps idle server connections as routine housekeeping; pg surfaces
  // that as an 'error' event on the Pool. With no Pool-level listener, Node
  // escalates it to an uncaught exception that kills the warm instance (57P01).
  // Log and swallow — the pool re-establishes on next use.
  // See docs/guides/platform/SUPABASE_ON_VERCEL.md §4.
  pool.on("error", (err) => {
    console.error("[pg pool] idle client error (non-fatal):", err.message);
  });
  const adapter = new PrismaPg(pool);

  const client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  // Ensure graceful shutdown on hot reload in development
  if (process.env.NODE_ENV !== "production") {
    // Clean up on process termination
    const cleanup = async () => {
      await client.$disconnect();
    };

    process.on("beforeExit", cleanup);
    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);
  }

  return client;
};

let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
  prisma = prismaClientSingleton();
} else {
  if (!global.cachedPrisma) {
    global.cachedPrisma = prismaClientSingleton();
  }
  prisma = global.cachedPrisma;
}

export const prismadb = prisma;
