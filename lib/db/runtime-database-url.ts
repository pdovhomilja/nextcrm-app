/**
 * Which connection string the *runtime* Prisma pool (`lib/prisma.ts`) connects
 * through.
 *
 * Migrations and the Prisma CLI keep using `DATABASE_URL` — the Supabase
 * **session** pooler (`:5432`), which `prisma migrate deploy` / DDL require. But
 * the serverless request runtime should connect through the **transaction**
 * pooler (`:6543`), which multiplexes: N warm function instances no longer each
 * hold a dedicated session, so they can't exhaust the small session-pooler
 * `pool_size` (the `EMAXCONNSESSION` → better-auth `FAILED_TO_GET_SESSION` →
 * every-page-500 incident).
 *
 * `RUNTIME_DATABASE_URL` carries that transaction-pooler string and is
 * **optional**: when unset or blank the runtime falls back to `DATABASE_URL`, so
 * a Vercel scope that hasn't been given the var behaves exactly as before — a
 * missing value can never break a deploy. Roll it out per scope (QA/Preview
 * first, then Production).
 *
 * See `docs/guides/platform/SUPABASE_ON_VERCEL.md` §3.
 */
export function resolveRuntimeDatabaseUrl(): string {
  const runtime = process.env.RUNTIME_DATABASE_URL?.trim();
  if (runtime) return runtime;
  // Preserve the prior behavior exactly when the runtime var is absent
  // (including the "undefined" coercion if DATABASE_URL itself is unset).
  return `${process.env.DATABASE_URL}`;
}
