/**
 * Redis-Based Rate Limiting Middleware
 * Token bucket algorithm implementation for distributed API rate limiting
 *
 * This implementation is suitable for production environments with:
 * - Multiple server instances (load balancers, Kubernetes, etc.)
 * - Horizontal scaling requirements
 * - Distributed architecture
 *
 * Requirements:
 * - Redis server (6.0+)
 * - ioredis package
 * - Environment variables: REDIS_URL, REDIS_PASSWORD (optional)
 */

import { OrganizationPlan } from "@prisma/client";
import { NextResponse } from "next/server";
import Redis from "ioredis";

// Rate limit configuration by plan (same as in-memory version)
export const RATE_LIMITS: Record<
  OrganizationPlan,
  { requests: number; windowMs: number }
> = {
  FREE: { requests: 100, windowMs: 60 * 60 * 1000 }, // 100 requests/hour
  PRO: { requests: 1000, windowMs: 60 * 60 * 1000 }, // 1,000 requests/hour
  ENTERPRISE: { requests: 10000, windowMs: 60 * 60 * 1000 }, // 10,000 requests/hour
};

interface RateLimitData {
  count: number;
  resetTime: number;
}

/**
 * Redis client configuration with connection pooling and retry logic
 */
class RedisRateLimitStore {
  private client: Redis;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private readonly maxReconnectAttempts: number = 10;

  constructor() {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    const redisPassword = process.env.REDIS_PASSWORD;

    this.client = new Redis(redisUrl, {
      password: redisPassword || undefined,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      enableOfflineQueue: true,
      connectTimeout: 10000,
      retryStrategy: (times: number) => {
        if (times > this.maxReconnectAttempts) {
          console.error(
            `Redis connection failed after ${times} attempts. Falling back to allow requests.`
          );
          return null; // Stop retrying
        }
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    // Event handlers
    this.client.on("connect", () => {
      console.log("Redis rate limiter: Connected to Redis");
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.client.on("ready", () => {
      console.log("Redis rate limiter: Ready to accept commands");
    });

    this.client.on("error", (error) => {
      console.error("Redis rate limiter error:", error);
      this.isConnected = false;
    });

    this.client.on("close", () => {
      console.warn("Redis rate limiter: Connection closed");
      this.isConnected = false;
    });

    this.client.on("reconnecting", () => {
      this.reconnectAttempts++;
      console.log(
        `Redis rate limiter: Reconnecting (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
      );
    });
  }

  /**
   * Get rate limit key for an organization
   */
  private getRateLimitKey(organizationId: string): string {
    return `ratelimit:${organizationId}`;
  }

  /**
   * Check if Redis is connected
   */
  isHealthy(): boolean {
    return this.isConnected && this.client.status === "ready";
  }

  /**
   * Get rate limit data from Redis
   */
  async get(key: string): Promise<RateLimitData | null> {
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("Redis GET error:", error);
      return null;
    }
  }

  /**
   * Set rate limit data in Redis with TTL
   */
  async set(key: string, value: RateLimitData, ttlMs: number): Promise<void> {
    try {
      const ttlSeconds = Math.ceil(ttlMs / 1000);
      await this.client.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      console.error("Redis SET error:", error);
      throw error;
    }
  }

  /**
   * Increment rate limit counter atomically using Lua script
   * This ensures thread-safe increments across multiple servers
   */
  async increment(
    key: string,
    limit: number,
    windowMs: number
  ): Promise<{ allowed: boolean; current: number; resetTime: number }> {
    try {
      // Lua script for atomic increment with rate limit check
      const luaScript = `
        local key = KEYS[1]
        local limit = tonumber(ARGV[1])
        local windowMs = tonumber(ARGV[2])
        local now = tonumber(ARGV[3])

        local data = redis.call('GET', key)
        local count = 0
        local resetTime = now + windowMs

        if data then
          local decoded = cjson.decode(data)
          count = decoded.count
          resetTime = decoded.resetTime

          -- Reset if window expired
          if now > resetTime then
            count = 0
            resetTime = now + windowMs
          end
        end

        -- Check if limit exceeded
        local allowed = count < limit

        if allowed then
          count = count + 1
          local newData = cjson.encode({count = count, resetTime = resetTime})
          local ttlSeconds = math.ceil((resetTime - now) / 1000)
          redis.call('SETEX', key, ttlSeconds, newData)
        end

        return {allowed and 1 or 0, count, resetTime}
      `;

      const result = await this.client.eval(
        luaScript,
        1,
        key,
        limit.toString(),
        windowMs.toString(),
        Date.now().toString()
      );

      const [allowed, current, resetTime] = result as [number, number, number];

      return {
        allowed: allowed === 1,
        current,
        resetTime,
      };
    } catch (error) {
      console.error("Redis increment error:", error);
      throw error;
    }
  }

  /**
   * Delete rate limit entry
   */
  async delete(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      console.error("Redis DELETE error:", error);
      throw error;
    }
  }

  /**
   * Get all rate limit keys (admin use)
   */
  async getAllKeys(): Promise<string[]> {
    try {
      return await this.client.keys("ratelimit:*");
    } catch (error) {
      console.error("Redis KEYS error:", error);
      return [];
    }
  }

  /**
   * Close Redis connection gracefully
   */
  async close(): Promise<void> {
    try {
      await this.client.quit();
      console.log("Redis rate limiter: Connection closed gracefully");
    } catch (error) {
      console.error("Error closing Redis connection:", error);
    }
  }
}

// Singleton instance
let redisStore: RedisRateLimitStore | null = null;

/**
 * Get or create Redis store instance
 */
function getRedisStore(): RedisRateLimitStore {
  if (!redisStore) {
    redisStore = new RedisRateLimitStore();
  }
  return redisStore;
}

/**
 * Check if request is within rate limit
 * Distributed-safe implementation using Redis
 */
export async function checkRateLimit(
  organizationId: string,
  plan: OrganizationPlan
): Promise<{
  allowed: boolean;
  remaining: number;
  resetTime: number;
  limit: number;
}> {
  const store = getRedisStore();
  const limit = RATE_LIMITS[plan];
  const key = `ratelimit:${organizationId}`;

  // Fallback behavior if Redis is unavailable
  if (!store.isHealthy()) {
    console.warn(
      "Redis is unavailable, allowing request (fail-open behavior)"
    );
    return {
      allowed: true,
      remaining: limit.requests,
      resetTime: Date.now() + limit.windowMs,
      limit: limit.requests,
    };
  }

  try {
    const result = await store.increment(
      key,
      limit.requests,
      limit.windowMs
    );

    const remaining = Math.max(0, limit.requests - result.current);

    return {
      allowed: result.allowed,
      remaining: result.allowed ? remaining : 0,
      resetTime: result.resetTime,
      limit: limit.requests,
    };
  } catch (error) {
    console.error("Rate limit check failed:", error);
    // Fail-open: Allow request if Redis error occurs
    return {
      allowed: true,
      remaining: limit.requests,
      resetTime: Date.now() + limit.windowMs,
      limit: limit.requests,
    };
  }
}

/**
 * Get current rate limit status without incrementing
 */
export async function getRateLimitStatus(
  organizationId: string,
  plan: OrganizationPlan
): Promise<{
  remaining: number;
  resetTime: number;
  limit: number;
  used: number;
}> {
  const store = getRedisStore();
  const limit = RATE_LIMITS[plan];
  const key = `ratelimit:${organizationId}`;
  const now = Date.now();

  if (!store.isHealthy()) {
    return {
      remaining: limit.requests,
      resetTime: now + limit.windowMs,
      limit: limit.requests,
      used: 0,
    };
  }

  try {
    const rateLimitData = await store.get(key);

    // If no data or expired, return full limit
    if (!rateLimitData || now > rateLimitData.resetTime) {
      return {
        remaining: limit.requests,
        resetTime: now + limit.windowMs,
        limit: limit.requests,
        used: 0,
      };
    }

    const remaining = Math.max(0, limit.requests - rateLimitData.count);

    return {
      remaining,
      resetTime: rateLimitData.resetTime,
      limit: limit.requests,
      used: rateLimitData.count,
    };
  } catch (error) {
    console.error("Get rate limit status failed:", error);
    return {
      remaining: limit.requests,
      resetTime: now + limit.windowMs,
      limit: limit.requests,
      used: 0,
    };
  }
}

/**
 * Create rate limit response headers
 */
export function createRateLimitHeaders(
  limit: number,
  remaining: number,
  resetTime: number
): Record<string, string> {
  const resetTimeSeconds = Math.floor(resetTime / 1000);
  const retryAfterSeconds = Math.floor((resetTime - Date.now()) / 1000);

  return {
    "X-RateLimit-Limit": limit.toString(),
    "X-RateLimit-Remaining": remaining.toString(),
    "X-RateLimit-Reset": resetTimeSeconds.toString(),
    ...(remaining === 0 ? { "Retry-After": retryAfterSeconds.toString() } : {}),
  };
}

/**
 * Create 429 Too Many Requests response
 */
export function createRateLimitExceededResponse(
  resetTime: number
): NextResponse {
  const retryAfterSeconds = Math.ceil((resetTime - Date.now()) / 1000);

  return NextResponse.json(
    {
      error: "Too Many Requests",
      message: "Rate limit exceeded. Please try again later.",
      retryAfter: retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "Retry-After": retryAfterSeconds.toString(),
      },
    }
  );
}

/**
 * Apply rate limiting to API response
 */
export async function applyRateLimit(
  response: NextResponse,
  organizationId: string,
  plan: OrganizationPlan
): Promise<NextResponse> {
  const result = await checkRateLimit(organizationId, plan);

  if (!result.allowed) {
    return createRateLimitExceededResponse(result.resetTime);
  }

  // Add rate limit headers to response
  const headers = createRateLimitHeaders(
    result.limit,
    result.remaining,
    result.resetTime
  );

  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

/**
 * Reset rate limit for an organization (admin use)
 */
export async function resetRateLimit(organizationId: string): Promise<void> {
  const store = getRedisStore();
  const key = `ratelimit:${organizationId}`;
  await store.delete(key);
}

/**
 * Get all rate limit entries (admin use)
 */
export async function getAllRateLimits(): Promise<
  Map<string, RateLimitData>
> {
  const store = getRedisStore();
  const keys = await store.getAllKeys();
  const results = new Map<string, RateLimitData>();

  for (const key of keys) {
    const data = await store.get(key);
    if (data) {
      results.set(key, data);
    }
  }

  return results;
}

/**
 * Health check for Redis connection
 */
export function isRedisHealthy(): boolean {
  const store = getRedisStore();
  return store.isHealthy();
}

/**
 * Gracefully close Redis connection
 * Call this during application shutdown
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisStore) {
    await redisStore.close();
    redisStore = null;
  }
}
