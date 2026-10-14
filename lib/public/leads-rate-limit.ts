import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ENDPOINT = "public-leads";

let limiter: Ratelimit | null | undefined;

function getLimiter(): Ratelimit | null {
  if (limiter !== undefined) return limiter;
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    limiter = null;
    return null;
  }
  limiter = new Ratelimit({
    redis: Redis.fromEnv(),
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
