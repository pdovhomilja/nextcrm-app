import { createHash } from "crypto";

import { getUpstashRedis } from "@/lib/cache/upstash-redis";

const PREFIX = "search:v1";

function cacheKey(
  userId: string,
  namespace: string,
  parts: Record<string, string | number | boolean>
): string {
  const payload = JSON.stringify(
    Object.keys(parts)
      .sort()
      .map((k) => [k, parts[k]])
  );
  const hash = createHash("sha256").update(payload).digest("hex").slice(0, 20);
  return `${PREFIX}:${namespace}:${userId}:${hash}`;
}

export async function getSearchCache<T>(
  userId: string,
  namespace: string,
  parts: Record<string, string | number | boolean>
): Promise<T | null> {
  const redis = getUpstashRedis();
  if (!redis) return null;
  try {
    return (await redis.get<T>(cacheKey(userId, namespace, parts))) ?? null;
  } catch (error) {
    console.error("[search-cache] get", namespace, error);
    return null;
  }
}

export async function setSearchCache<T>(
  userId: string,
  namespace: string,
  parts: Record<string, string | number | boolean>,
  value: T,
  ttlSeconds: number
): Promise<void> {
  const redis = getUpstashRedis();
  if (!redis) return;
  try {
    await redis.set(cacheKey(userId, namespace, parts), value, { ex: ttlSeconds });
  } catch (error) {
    console.error("[search-cache] set", namespace, error);
  }
}

/** Run `fn` with optional Redis cache (skipped when Upstash is not configured). */
export async function withSearchCache<T>(
  userId: string,
  namespace: string,
  parts: Record<string, string | number | boolean>,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<T> {
  const hit = await getSearchCache<T>(userId, namespace, parts);
  if (hit !== null) return hit;
  const value = await fn();
  await setSearchCache(userId, namespace, parts, value, ttlSeconds);
  return value;
}
