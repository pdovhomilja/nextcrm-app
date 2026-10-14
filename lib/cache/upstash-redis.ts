import { Redis } from "@upstash/redis";

let client: Redis | null | undefined;

/** Failures before skipping Redis briefly (saves free-tier quota; Postgres remains source of truth). */
const MAX_FAILURES_BEFORE_BYPASS = 3;
const BYPASS_COOLDOWN_MS = 60_000;

let consecutiveFailures = 0;
let bypassUntilMs = 0;

function isRateOrQuotaError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /429|quota|rate.?limit|too many|monthly/i.test(msg);
}

/** Opt out of all Redis caches (search, mailbox). App uses Postgres only. */
export function isRedisCacheDisabledByEnv(): boolean {
  const flag = process.env.REDIS_CACHE_DISABLED ?? process.env.SEARCH_CACHE_DISABLED;
  return flag === "1" || flag?.toLowerCase() === "true";
}

/** True when Redis cache reads/writes are allowed (configured, not bypassed, not disabled). */
export function isRedisCacheActive(): boolean {
  if (isRedisCacheDisabledByEnv()) return false;
  if (Date.now() < bypassUntilMs) return false;
  return isUpstashConfigured();
}

export function isUpstashConfigured(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

/**
 * Upstash Redis — Vercel Marketplace → **Upstash Redis** (not “Upstash Search”).
 * Sets UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN.
 */
export function getUpstashRedis(): Redis | null {
  if (!isRedisCacheActive()) return null;
  if (client !== undefined) return client;
  client = Redis.fromEnv();
  return client;
}

export function recordRedisCacheSuccess(): void {
  consecutiveFailures = 0;
}

export function recordRedisCacheFailure(error: unknown): void {
  consecutiveFailures += 1;
  if (consecutiveFailures >= MAX_FAILURES_BEFORE_BYPASS || isRateOrQuotaError(error)) {
    bypassUntilMs = Date.now() + BYPASS_COOLDOWN_MS;
    consecutiveFailures = 0;
    console.warn(
      "[upstash-redis] Cache unavailable or quota hit — using Postgres fallback for ~60s"
    );
  }
}
