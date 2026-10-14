import { Redis } from "@upstash/redis";

let client: Redis | null | undefined;

/**
 * Upstash Redis — add via Vercel Marketplace → Upstash (sets UPSTASH_REDIS_REST_URL / TOKEN).
 * Used for search caches, mailbox lists, and rate limits.
 */
export function getUpstashRedis(): Redis | null {
  if (client !== undefined) return client;
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    client = null;
    return null;
  }
  client = Redis.fromEnv();
  return client;
}

export function isUpstashConfigured(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}
