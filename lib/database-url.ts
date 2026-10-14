import type { PoolConfig } from "pg";

/**
 * Resolves Postgres URLs for Supabase ↔ Vercel integration and manual DATABASE_URL.
 *
 * Vercel + Supabase typically injects:
 * - POSTGRES_URL / POSTGRES_PRISMA_URL → pooled (runtime)
 * - POSTGRES_URL_NON_POOLING → direct (migrations)
 */

function firstNonEmpty(...values: Array<string | undefined>): string | undefined {
  for (const v of values) {
    const t = v?.trim();
    if (t) return t;
  }
  return undefined;
}

/** Pooled / serverless-friendly URL for the running app. */
export function resolveRuntimeDatabaseUrl(): string {
  const supabasePooled = firstNonEmpty(
    process.env.POSTGRES_PRISMA_URL,
    process.env.POSTGRES_URL
  );
  // On Vercel, Supabase integration vars beat a stale manual DATABASE_URL (e.g. old Prisma Postgres).
  const url =
    process.env.VERCEL === "1" && supabasePooled
      ? supabasePooled
      : firstNonEmpty(process.env.DATABASE_URL, supabasePooled);
  if (!url) {
    throw new Error(
      "No database URL: set DATABASE_URL or connect Supabase to Vercel (POSTGRES_URL / POSTGRES_PRISMA_URL)."
    );
  }
  return normalizeSupabasePooledUrl(url);
}

/** Direct URL for prisma migrate deploy (build step). */
export function resolveMigrateDatabaseUrl(): string {
  return (
    firstNonEmpty(
      process.env.DIRECT_DATABASE_URL,
      process.env.POSTGRES_URL_NON_POOLING,
      process.env.DIRECT_URL,
      process.env.DATABASE_URL
    ) ?? resolveRuntimeDatabaseUrl()
  );
}

/** Prisma + Supavisor transaction pooler (port 6543) needs pgbouncer=true. */
export function normalizeSupabasePooledUrl(url: string): string {
  try {
    const normalized = url.replace(/^postgres:\/\//, "postgresql://");
    const parsed = new URL(normalized);
    const isPooler =
      parsed.port === "6543" ||
      parsed.hostname.includes("pooler") ||
      parsed.searchParams.get("pgbouncer") === "true";
    if (isPooler && !parsed.searchParams.has("pgbouncer")) {
      parsed.searchParams.set("pgbouncer", "true");
    }
    return parsed.toString().replace(/^postgresql:\/\//, "postgres://");
  } catch {
    return url;
  }
}

function isLocalPostgresHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "postgres" ||
    hostname.endsWith(".local")
  );
}

/**
 * SSL for node-postgres (@prisma/adapter-pg). Local Docker Postgres runs without TLS;
 * Supabase / Vercel pooler URLs need TLS but often fail strict CA verification
 * ("self-signed certificate in certificate chain") unless rejectUnauthorized is off.
 *
 * Set DATABASE_SSL_REJECT_UNAUTHORIZED=1 to enforce certificate verification.
 */
export function resolvePgSslConfig(connectionString: string): PoolConfig["ssl"] {
  const override = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED?.trim().toLowerCase();
  if (override === "1" || override === "true" || override === "yes") {
    return { rejectUnauthorized: true };
  }
  if (override === "0" || override === "false" || override === "no") {
    return { rejectUnauthorized: false };
  }

  try {
    const parsed = new URL(connectionString.replace(/^postgres:\/\//, "postgresql://"));
    if (isLocalPostgresHost(parsed.hostname)) return undefined;

    const sslmode = parsed.searchParams.get("sslmode")?.toLowerCase();
    if (sslmode === "disable") return undefined;
    if (sslmode === "no-verify") return { rejectUnauthorized: false };

    return { rejectUnauthorized: false };
  } catch {
    return process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined;
  }
}
