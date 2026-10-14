import { Ratelimit } from "@upstash/ratelimit";

import { getUpstashRedis } from "@/lib/cache/upstash-redis";

const ENDPOINT = "public-leads";

let limiter: Ratelimit | null | undefined;

function getLimiter(): Ratelimit | null {
  if (limiter !== undefined) return limiter;
  const redis = getUpstashRedis();
  if (!redis) {
    limiter = null;
    return null;
  }
  limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, "1 m"),
    prefix: `ratelimit:${ENDPOINT}`,
  });
  return limiter;
}

export async function checkPublicLeadsRateLimit(ip: string): Promise<boolean> {
  const rl = getLimiter();
  if (!rl) return true;
  const { success } = await rl.limit(ip);
  return success;
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(/,\s*/)[0]?.trim() || "127.0.0.1";
  return request.headers.get("x-real-ip")?.trim() || "127.0.0.1";
}
