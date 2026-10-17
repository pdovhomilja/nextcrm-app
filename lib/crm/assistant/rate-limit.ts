import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Assistant traffic all arrives from n8n Cloud, so limits are per caller IP and
// generous enough for a busy day of chats/calls while still capping a runaway
// retry loop or a leaked token. Sits in front of auth, so it also slows token guessing.
const LIMIT = 60;
const WINDOW = "1 m";

let limiter: Ratelimit | null | undefined;

function getLimiter(): Ratelimit | null {
  if (limiter !== undefined) return limiter;
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    if (process.env.NODE_ENV === "production") {
      console.warn("[assistant-inquiry] Upstash not configured; rate limiting disabled");
    }
    limiter = null;
    return limiter;
  }
  limiter = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(LIMIT, WINDOW),
    prefix: "ratelimit:assistant-inquiry",
  });
  return limiter;
}

export function getCallerIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Fails open (allows) when Upstash is unconfigured or unreachable: the bearer
 * token is the security boundary, the limiter is only abuse damping.
 */
export async function checkAssistantRateLimit(req: Request): Promise<{ success: boolean }> {
  try {
    const rl = getLimiter();
    if (!rl) return { success: true };
    const { success } = await rl.limit(getCallerIp(req));
    return { success };
  } catch (error) {
    console.error("[assistant-inquiry] rate limit check failed; allowing", error);
    return { success: true };
  }
}
