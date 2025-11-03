/**
 * Rate Limiting Middleware
 * Token bucket algorithm implementation for API rate limiting
 *
 * ⚠️ PRODUCTION WARNING:
 * This implementation uses in-memory storage and will NOT work correctly
 * in multi-server deployments (load balancers, Kubernetes, horizontal scaling, etc.).
 *
 * WHEN TO USE THIS:
 * - Single server deployments only
 * - Development and testing environments
 * - Small-scale production with guaranteed single instance
 *
 * FOR PRODUCTION WITH MULTIPLE SERVERS:
 * - Use rate-limit-redis.ts instead for distributed rate limiting
 * - See RATE_LIMITING_PRODUCTION_GUIDE.md for migration instructions
 * - Redis ensures rate limits work correctly across all server instances
 *
 * RISK: In load-balanced environments, each server maintains its own counter,
 * allowing users to bypass rate limits by hitting different servers.
 * Example: 100 req/hour limit with 3 servers = 300 actual req/hour possible.
 */

import { OrganizationPlan } from "@prisma/client";
import { NextResponse } from "next/server";

// Rate limit configuration by plan
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

// In-memory store for rate limiting
// In production, use Redis for distributed rate limiting
const rateLimitStore = new Map<string, RateLimitData>();

/**
 * Clean up expired rate limit entries periodically
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now > data.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredEntries, 5 * 60 * 1000);

/**
 * Get rate limit key for an organization
 */
function getRateLimitKey(organizationId: string): string {
  return `ratelimit:${organizationId}`;
}

/**
 * Check if request is within rate limit
 */
export function checkRateLimit(
  organizationId: string,
  plan: OrganizationPlan
): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  limit: number;
} {
  const key = getRateLimitKey(organizationId);
  const limit = RATE_LIMITS[plan];
  const now = Date.now();

  let rateLimitData = rateLimitStore.get(key);

  // Initialize or reset if window expired
  if (!rateLimitData || now > rateLimitData.resetTime) {
    rateLimitData = {
      count: 0,
      resetTime: now + limit.windowMs,
    };
    rateLimitStore.set(key, rateLimitData);
  }

  // Check if limit exceeded
  const allowed = rateLimitData.count < limit.requests;

  if (allowed) {
    rateLimitData.count++;
    rateLimitStore.set(key, rateLimitData);
  }

  const remaining = Math.max(0, limit.requests - rateLimitData.count);

  return {
    allowed,
    remaining,
    resetTime: rateLimitData.resetTime,
    limit: limit.requests,
  };
}

/**
 * Get current rate limit status without incrementing
 */
export function getRateLimitStatus(
  organizationId: string,
  plan: OrganizationPlan
): {
  remaining: number;
  resetTime: number;
  limit: number;
  used: number;
} {
  const key = getRateLimitKey(organizationId);
  const limit = RATE_LIMITS[plan];
  const now = Date.now();

  const rateLimitData = rateLimitStore.get(key);

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
export function applyRateLimit(
  response: NextResponse,
  organizationId: string,
  plan: OrganizationPlan
): NextResponse {
  const result = checkRateLimit(organizationId, plan);

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
export function resetRateLimit(organizationId: string): void {
  const key = getRateLimitKey(organizationId);
  rateLimitStore.delete(key);
}

/**
 * Get all rate limit entries (admin use)
 */
export function getAllRateLimits(): Map<string, RateLimitData> {
  return new Map(rateLimitStore);
}
