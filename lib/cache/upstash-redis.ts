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

function resolveUpstashRestUrl(): string | undefined {
  return (
    process.env.UPSTASH_REDIS_REST_URL?.trim() ||
    process.env.KV_REST_API_URL?.trim() ||
    undefined
  );
}

function resolveUpstashRestToken(): string | undefined {
  return (
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ||
    process.env.KV_REST_API_TOKEN?.trim() ||
    undefined
  );
}

/** True when REST URL + token exist (Upstash or Vercel KV naming). */
export function isUpstashConfigured(): boolean {
  return Boolean(resolveUpstashRestUrl() && resolveUpstashRestToken());
}

/** True when Redis cache reads/writes are allowed (configured, not bypassed, not disabled). */
export function isRedisCacheActive(): boolean {
  if (isRedisCacheDisabledByEnv()) return false;
  if (Date.now() < bypassUntilMs) return false;
  return isUpstashConfigured();
}

/**
 * Upstash Redis — Vercel Marketplace → **Upstash Redis** (not “Upstash Search”).
 * Accepts UPSTASH_REDIS_REST_* or legacy KV_REST_API_* from Vercel KV integrations.
 */
export function getUpstashRedis(): Redis | null {
  if (!isRedisCacheActive()) return null;
  if (client !== undefined) return client;

  const url = resolveUpstashRestUrl();
  const token = resolveUpstashRestToken();
  if (!url || !token) {
    client = null;
    return client;
  }

  client = new Redis({ url, token });
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

/** For admin diagnostics — no secrets. */
export async function getRedisCacheDiagnostics(): Promise<{
  configured: boolean;
  active: boolean;
  disabledByEnv: boolean;
  bypassSecondsRemaining: number;
  pingOk: boolean | null;
}> {
  const configured = isUpstashConfigured();
  const disabledByEnv = isRedisCacheDisabledByEnv();
  const active = isRedisCacheActive();
  const bypassSecondsRemaining =
    bypassUntilMs > Date.now() ? Math.ceil((bypassUntilMs - Date.now()) / 1000) : 0;

  let pingOk: boolean | null = null;
  const redis = getUpstashRedis();
  if (redis) {
    try {
      const pong = await redis.ping();
      pingOk = pong === "PONG";
      recordRedisCacheSuccess();
    } catch (e) {
      pingOk = false;
      recordRedisCacheFailure(e);
    }
  }

  return {
    configured,
    active,
    disabledByEnv,
    bypassSecondsRemaining,
    pingOk,
  };
}
