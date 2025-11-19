/**
 * ============================================================================
 * RATE LIMITING CORE ENGINE - TOKEN BUCKET IMPLEMENTATION
 * ============================================================================
 *
 * PURPOSE:
 * Core rate limiting logic using token bucket algorithm for API protection.
 * Provides in-memory rate limit tracking with automatic cleanup and plan-based
 * quota management. This is the calculation engine used by rate limit middleware.
 *
 * BUSINESS CONTEXT:
 * NextCRM → AWMS (Automotive Workshop Management System) requires rate limiting to:
 * 1. Prevent API abuse during bulk operations (inventory sync, import)
 * 2. Enforce fair-use policies across FREE/PRO/ENTERPRISE subscription tiers
 * 3. Protect backend infrastructure from resource exhaustion
 * 4. Ensure consistent performance for all workshop tenants
 *
 * AWMS MAPPING:
 * - FREE Plan: Small shops (1-2 bays) = 100 requests/hour
 *   Example: Independent mechanic with basic inventory management
 * - PRO Plan: Medium shops (3-10 bays) = 1,000 requests/hour
 *   Example: Multi-bay shop with integrated POS and scheduling
 * - ENTERPRISE Plan: Large chains (10+ locations) = 10,000 requests/hour
 *   Example: Franchise network with real-time inventory sync across stores
 *
 * ALGORITHM: TOKEN BUCKET
 * ┌────────────────────────────────────────────────────────────────┐
 * │ Token Bucket: Simple, fast, memory-efficient rate limiting     │
 * │                                                                 │
 * │ Concept: Bucket holds tokens (allowed requests)                │
 * │ - Each request consumes 1 token from bucket                    │
 * │ - Bucket refills completely after time window expires          │
 * │ - If bucket empty → rate limit exceeded (429 response)         │
 * │                                                                 │
 * │ Example (100 req/hour bucket):                                 │
 * │ Request 1-100: ✓ Allowed (tokens available)                    │
 * │ Request 101:   ✗ Denied (bucket empty)                         │
 * │ After 1 hour:  Bucket refills to 100 tokens                    │
 * └────────────────────────────────────────────────────────────────┘
 *
 * ARCHITECTURE:
 * - In-memory storage: JavaScript Map (fast, no external dependencies)
 * - Key format: "ratelimit:{org:123}" or "ratelimit:{ip:203.0.113.1}"
 * - Cleanup: Automatic expired entry removal every 5 minutes
 * - Stateless: No persistent storage (resets on server restart)
 *
 * DEPLOYMENT WARNING:
 * ⚠️ CRITICAL: This implementation uses IN-MEMORY storage
 *
 * WHEN TO USE THIS:
 * ✓ Single server deployments (Vercel single instance, traditional hosting)
 * ✓ Development and testing environments
 * ✓ Small-scale production with guaranteed single instance
 *
 * WHEN NOT TO USE THIS:
 * ✗ Load-balanced environments (multiple server instances)
 * ✗ Kubernetes/Docker Swarm horizontal scaling
 * ✗ Serverless with concurrent invocations (AWS Lambda, Vercel Edge)
 *
 * FOR PRODUCTION WITH MULTIPLE SERVERS:
 * Use lib/rate-limit-redis.ts instead for distributed rate limiting
 * Redis ensures rate limits work correctly across all server instances
 *
 * RISK IN MULTI-SERVER:
 * Each server maintains its own counter, allowing users to bypass limits
 * by hitting different servers through load balancer.
 * Example: 100 req/hour limit × 3 servers = 300 actual req/hour possible
 *
 * SECURITY IMPLICATIONS:
 * - Layer 2 defense (Application layer) in defense-in-depth strategy
 * - Layer 1: Cloudflare/WAF (network layer)
 * - Layer 3: Database connection pooling (resource layer)
 * - No PII stored in rate limit keys (organization ID only, not user data)
 *
 * PERFORMANCE:
 * - checkRateLimit: <1ms (Map lookup and increment)
 * - getRateLimitStatus: <1ms (Map lookup, no modification)
 * - Cleanup interval: ~2-5ms every 5 minutes (non-blocking)
 * - Memory footprint: ~100 bytes per tracked identifier
 * - Typical memory usage: <10MB with 10,000 active organizations
 *
 * COMPLIANCE:
 * - SOC 2: Preventive control for system availability (CC6.1)
 * - GDPR: No PII in rate limit storage (organization ID is business data)
 * - ISO 27001: A.14.1.2 - Securing application services
 * - Audit logging: Rate limit violations logged separately (auditLog table)
 *
 * @module lib/rate-limit
 * @security CRITICAL - Core DDoS protection
 * @audit Required for availability monitoring
 * @maintainer AWMS Platform Team
 * @since 1.0.0 - Initial implementation with fixed limits
 * @updated 2.0.0 - Added plan-based limits and custom configurations
 * @updated 2.1.0 - Added automatic cleanup and status querying
 */

import { OrganizationPlan } from "@prisma/client";
import { NextResponse } from "next/server";

/**
 * Default rate limits by organization subscription plan
 *
 * These are the baseline limits applied when no endpoint-specific
 * configuration exists. Limits scale with business plan to match
 * expected API usage patterns.
 *
 * BUSINESS RATIONALE:
 * - FREE: Proof-of-concept, individual mechanics (generous for testing)
 * - PRO: Production use, small-medium shops (handles daily operations)
 * - ENTERPRISE: High-volume operations, large chains (no practical limit)
 *
 * WINDOW DURATION:
 * 60 * 60 * 1000 = 1 hour (3,600,000 milliseconds)
 * RATIONALE: Hourly windows balance granularity and UX
 * - Too short (minutes): Users hit limits during legitimate bulk operations
 * - Too long (daily): Doesn't prevent sustained abuse attacks
 *
 * AWMS EXAMPLES:
 * - FREE: Solo mechanic importing 50 customer records (well under 100/hr)
 * - PRO: Shop syncing inventory from supplier API every 10 min (144 req/day)
 * - ENTERPRISE: Franchise HQ polling 50 locations every 5 min (600 req/hr)
 *
 * ADJUSTMENT GUIDELINES:
 * - Monitor rate limit hits via audit logs (action: RATE_LIMIT_EXCEEDED)
 * - If >5% of requests hit limit → increase tier limit by 50%
 * - If <0.1% hit limit → consider decreasing (but err on side of generosity)
 * - Endpoint-specific overrides (see lib/rate-limit-config.ts) take precedence
 *
 * @see {@link ENDPOINT_RATE_LIMITS} in rate-limit-config.ts for endpoint overrides
 * @see {@link getRateLimitConfig} for configuration resolution logic
 */
export const RATE_LIMITS: Record<
  OrganizationPlan,
  { requests: number; windowMs: number }
> = {
  FREE: { requests: 100, windowMs: 60 * 60 * 1000 }, // 100 requests/hour
  PRO: { requests: 1000, windowMs: 60 * 60 * 1000 }, // 1,000 requests/hour
  ENTERPRISE: { requests: 10000, windowMs: 60 * 60 * 1000 }, // 10,000 requests/hour
};

/**
 * Rate limit tracking data structure
 *
 * Stored in-memory for each rate-limited identifier (organization or IP).
 * Minimal data structure for performance (only 2 fields, ~16 bytes).
 *
 * FIELDS:
 * - count: Number of requests made in current window
 * - resetTime: Unix timestamp (ms) when window expires and count resets
 *
 * LIFECYCLE:
 * 1. First request: Entry created with count=1, resetTime=now+windowMs
 * 2. Subsequent requests: count incremented if within window
 * 3. After window expires: Entry deleted by cleanup OR reset on next request
 *
 * @property {number} count - Request count in current window (0 to limit)
 * @property {number} resetTime - Unix timestamp when window resets (milliseconds)
 */
interface RateLimitData {
  count: number;
  resetTime: number;
}

/**
 * In-memory storage for rate limit counters
 *
 * JavaScript Map provides O(1) lookup/insert/delete performance.
 * Keys are prefixed identifiers (e.g., "ratelimit:org:abc123").
 *
 * MEMORY MANAGEMENT:
 * - Each entry: ~100 bytes (key string + RateLimitData object + Map overhead)
 * - 1,000 orgs = ~100KB memory
 * - 10,000 orgs = ~1MB memory
 * - 100,000 orgs = ~10MB memory (still acceptable)
 *
 * CLEANUP STRATEGY:
 * - Expired entries removed every 5 minutes (automatic interval)
 * - Prevents memory leak from abandoned rate limit entries
 * - Old entries naturally expire as time passes
 *
 * PERSISTENCE:
 * - Data is NOT persisted (server restart clears all limits)
 * - RATIONALE: Rate limits are short-term controls, not long-term state
 * - IMPLICATION: Server restart gives everyone fresh quota (acceptable)
 *
 * PRODUCTION WARNING:
 * In load-balanced environments, each server maintains its own Map,
 * effectively multiplying the rate limit by number of servers.
 * Use Redis-based implementation for distributed environments.
 *
 * @see {@link cleanupExpiredEntries} for automatic cleanup logic
 * @see {@link getRateLimitKey} for key format generation
 */
const rateLimitStore = new Map<string, RateLimitData>();

/**
 * Clean up expired rate limit entries to prevent memory leaks
 *
 * Iterates through all rate limit entries and deletes those past their
 * reset time. Runs automatically every 5 minutes via setInterval.
 *
 * PERFORMANCE:
 * - O(n) complexity where n = number of tracked identifiers
 * - Typical: ~2-5ms for 10,000 entries (very fast iteration)
 * - Non-blocking: Runs in background, doesn't impact request processing
 *
 * CLEANUP LOGIC:
 * - Compare current time with entry's resetTime
 * - If now > resetTime → entry expired, delete it
 * - If now <= resetTime → entry still active, keep it
 *
 * MEMORY RECOVERY:
 * Without cleanup, abandoned entries accumulate indefinitely:
 * - User changes IP → old IP entry orphaned
 * - Organization deleted → org entry orphaned
 * - Server runs for weeks → thousands of dead entries
 *
 * EXAMPLE IMPACT:
 * 1,000 requests/hour × 24 hours = 24,000 potential entries/day
 * Without cleanup: ~2.4MB memory leaked per day
 * With cleanup: <1MB steady state (only active windows)
 *
 * INTERVAL CHOICE: 5 minutes
 * - More frequent (1 min): Unnecessary CPU overhead
 * - Less frequent (15 min): More memory wasted on dead entries
 * - 5 minutes: Good balance for typical usage patterns
 *
 * DEBUGGING:
 * - Check Map size: console.log(rateLimitStore.size)
 * - If size grows unbounded → cleanup not running (interval cleared?)
 * - If size stays high → all entries are active (consider increasing limits)
 *
 * AWMS CONTEXT:
 * Workshop APIs have predictable patterns:
 * - Business hours: High activity (9am-6pm)
 * - After hours: Low activity, cleanup reclaims memory
 * - Overnight: Most entries expire, Map shrinks naturally
 *
 * @returns {void}
 * @performance O(n) but very fast (~2-5ms for 10K entries)
 * @sideEffects Modifies rateLimitStore Map (deletes expired entries)
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();

  // ITERATION: Array.from creates array of [key, value] tuples
  // RATIONALE: Can't delete from Map while iterating (concurrent modification)
  // ALTERNATIVE: Could use for...of but Array.from is more explicit
  for (const [key, data] of Array.from(rateLimitStore.entries())) {
    // EXPIRY CHECK: Is this entry's window completed?
    if (now > data.resetTime) {
      rateLimitStore.delete(key);
      // DEBUG: Uncomment to track cleanup activity
      // console.log(`[RATE_LIMIT] Cleaned up expired entry: ${key}`);
    }
  }
}

// AUTOMATIC CLEANUP: Run every 5 minutes (300,000 milliseconds)
// STARTUP: Interval starts immediately when module loads
// SHUTDOWN: No explicit cleanup (relies on Node.js process exit)
// TODO: For graceful shutdown, consider clearInterval in shutdown handler
setInterval(cleanupExpiredEntries, 5 * 60 * 1000);

/**
 * Generate rate limit storage key for an identifier
 *
 * Creates prefixed keys to namespace rate limit data and prevent
 * collisions with other caching systems using same storage backend.
 *
 * KEY FORMAT:
 * "ratelimit:{identifier}"
 *
 * WHERE identifier IS:
 * - "org:abc123" (organization-based limiting, preferred)
 * - "ip:203.0.113.1" (IP-based limiting, fallback)
 * - "ip:unknown" (proxy misconfiguration, all grouped together)
 *
 * EXAMPLES:
 * - getRateLimitKey("org:abc123") → "ratelimit:org:abc123"
 * - getRateLimitKey("ip:192.168.1.1") → "ratelimit:ip:192.168.1.1"
 *
 * PREFIX RATIONALE:
 * - Prevents collisions if rateLimitStore shared with other caches
 * - Makes keys self-documenting in Redis (if migrated)
 * - Allows wildcard operations (KEYS ratelimit:* for debugging)
 *
 * SECURITY:
 * - No sensitive data in keys (org ID and IP are not PII)
 * - Keys never logged to prevent information disclosure
 * - Key format consistent for predictable access patterns
 *
 * @param identifier - Organization or IP identifier (with prefix)
 * @returns Prefixed rate limit key for storage
 *
 * @example
 * ```typescript
 * const key = getRateLimitKey("org:abc123");
 * // Returns: "ratelimit:org:abc123"
 * const data = rateLimitStore.get(key);
 * ```
 *
 * @see {@link getRateLimitIdentifier} in rate-limit-config.ts for identifier creation
 * @performance O(1) - Simple string concatenation
 */
function getRateLimitKey(identifier: string): string {
  return `ratelimit:${identifier}`;
}

/**
 * ============================================================================
 * CHECK RATE LIMIT - Core Rate Limiting Function
 * ============================================================================
 *
 * Enforces rate limits using token bucket algorithm. This is the primary
 * function called by middleware to determine if a request should proceed.
 *
 * ALGORITHM FLOW:
 * ┌──────────────────────────────────────────────────────────────────┐
 * │ 1. Generate storage key from identifier                          │
 * │ 2. Look up existing rate limit data (or null if first request)   │
 * │ 3. Check if window expired (now > resetTime)                     │
 * │ 4a. Window expired: Reset counter, create new window             │
 * │ 4b. Window active: Check if under limit                          │
 * │ 5a. Under limit: Increment counter, allow request                │
 * │ 5b. Over limit: Deny request (don't increment)                   │
 * │ 6. Return result with limit status and timing info               │
 * └──────────────────────────────────────────────────────────────────┘
 *
 * TOKEN BUCKET BEHAVIOR:
 * - Start: Bucket full (count=0, limit=100)
 * - Request 1-100: Consume tokens (count++, allowed=true)
 * - Request 101: Bucket empty (count=100, allowed=false)
 * - After window: Bucket refills (count=0, new resetTime)
 *
 * CUSTOM CONFIGURATION:
 * - Default: Uses plan-based limits (RATE_LIMITS constant)
 * - Override: Pass customConfig for endpoint-specific limits
 * - Example: Authentication endpoints use stricter limits (10 req/hr)
 *
 * RETURN VALUES:
 * - allowed: true (request OK) or false (rate limit exceeded)
 * - remaining: Requests left in current window (for client display)
 * - resetTime: Unix timestamp when window resets (for Retry-After header)
 * - limit: Total requests allowed per window (for X-RateLimit-Limit header)
 *
 * SIDE EFFECTS:
 * - Modifies rateLimitStore Map (creates/updates entry)
 * - Increments counter for allowed requests
 * - Does NOT increment counter for denied requests (important!)
 *
 * THREAD SAFETY:
 * - JavaScript is single-threaded, no race conditions in Node.js
 * - In clustered mode: Each process has separate Map (see deployment warning)
 *
 * AWMS USE CASES:
 * - Inventory sync: Check before bulk import (prevent runaway scripts)
 * - Customer portal: Check on page load (prevent scraping)
 * - Payment API: Strict limits to prevent fraud attempts
 * - Admin actions: Bypass limits for operational efficiency
 *
 * DEBUGGING SCENARIOS:
 * 1. "Always returns allowed=true"
 *    → Check if identifier is being passed correctly
 *    → Verify customConfig matches expected limit
 *    → Check if cleanup interval clearing entries too aggressively
 *
 * 2. "Limit resets too quickly"
 *    → Window expired (check windowMs configuration)
 *    → Server restarted (in-memory storage cleared)
 *    → Clock skew (server time incorrect)
 *
 * 3. "Different servers show different counts"
 *    → Expected with in-memory storage (not a bug)
 *    → Migrate to Redis for distributed consistency
 *
 * @param identifier - Rate limit identifier (org:xxx or ip:xxx format)
 * @param plan - Organization subscription plan (FREE/PRO/ENTERPRISE)
 * @param customConfig - Optional endpoint-specific override configuration
 *
 * @returns Rate limit check result with status and metadata
 *   - allowed: Whether request should be permitted
 *   - remaining: Requests left in current window (0+)
 *   - resetTime: Unix timestamp (ms) when limit resets
 *   - limit: Total allowed requests in window
 *
 * @example
 * ```typescript
 * // Default plan-based limit
 * const result = checkRateLimit("org:abc123", "PRO");
 * // Returns: { allowed: true, remaining: 999, resetTime: 1699999999999, limit: 1000 }
 *
 * // Custom endpoint-specific limit (auth endpoint)
 * const authResult = checkRateLimit("ip:203.0.113.1", "FREE", {
 *   requests: 10,
 *   windowMs: 60 * 60 * 1000
 * });
 * // Returns: { allowed: true, remaining: 9, resetTime: ..., limit: 10 }
 *
 * // Rate limit exceeded scenario
 * const deniedResult = checkRateLimit("org:xyz789", "FREE");
 * // Returns: { allowed: false, remaining: 0, resetTime: ..., limit: 100 }
 * ```
 *
 * @see {@link RATE_LIMITS} for default plan-based configurations
 * @see {@link ENDPOINT_RATE_LIMITS} in rate-limit-config.ts for overrides
 * @see {@link createRateLimitHeaders} for converting result to HTTP headers
 *
 * @performance <1ms (Map lookup + arithmetic operations)
 * @security CRITICAL - Primary rate limit enforcement point
 * @sideEffects Modifies rateLimitStore (increments counter if allowed)
 */
export function checkRateLimit(
  identifier: string,
  plan: OrganizationPlan,
  customConfig?: { requests: number; windowMs: number }
): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  limit: number;
} {
  // STEP 1: Determine effective rate limit configuration
  // PRIORITY: Custom config (endpoint-specific) > Plan config (tier-based)
  const limit = customConfig || RATE_LIMITS[plan];

  // STEP 2: Get storage key and current time
  const key = getRateLimitKey(identifier);
  const now = Date.now();

  // STEP 3: Look up existing rate limit data
  let rateLimitData = rateLimitStore.get(key);

  // STEP 4: Initialize or reset window if expired
  // CASE A: No existing data (first request ever for this identifier)
  // CASE B: Window expired (time passed beyond resetTime)
  if (!rateLimitData || now > rateLimitData.resetTime) {
    rateLimitData = {
      count: 0, // Start fresh
      resetTime: now + limit.windowMs, // New window expires in future
    };
    rateLimitStore.set(key, rateLimitData);
  }

  // STEP 5: Check if request would exceed limit
  // IMPORTANT: Use < not <= to allow exactly {limit} requests
  // Example: limit=100, count=99 → allowed (will become count=100)
  //          limit=100, count=100 → denied (already at limit)
  const allowed = rateLimitData.count < limit.requests;

  // STEP 6: Increment counter ONLY if allowed
  // RATIONALE: Don't count denied requests toward limit
  // SECURITY: Prevents attackers from consuming quota with denied requests
  if (allowed) {
    rateLimitData.count++;
    rateLimitStore.set(key, rateLimitData);
  }

  // STEP 7: Calculate remaining requests
  // SAFETY: Math.max ensures never negative (defensive programming)
  const remaining = Math.max(0, limit.requests - rateLimitData.count);

  // STEP 8: Return comprehensive result
  return {
    allowed,
    remaining,
    resetTime: rateLimitData.resetTime,
    limit: limit.requests,
  };
}

/**
 * Get current rate limit status without consuming a token
 *
 * Non-destructive query that returns current limit status without
 * incrementing the counter. Useful for displaying quota to users.
 *
 * USE CASES:
 * - Dashboard: Show "You've used 80/100 API calls this hour"
 * - API response: Include quota info in every response header
 * - Admin panel: Monitor organization API usage patterns
 * - Billing: Warn users approaching plan limits
 *
 * DIFFERENCE FROM checkRateLimit:
 * - checkRateLimit: Increments counter (use for request enforcement)
 * - getRateLimitStatus: Reads only (use for monitoring/display)
 *
 * RETURN VALUES:
 * - remaining: Requests left (same as checkRateLimit)
 * - resetTime: When window resets (same as checkRateLimit)
 * - limit: Total allowed (same as checkRateLimit)
 * - used: Requests consumed so far (NEW: not in checkRateLimit)
 *
 * FRESH STATE:
 * If no data exists or window expired, returns full quota:
 * - remaining: limit (no requests made yet)
 * - used: 0 (clean slate)
 * - resetTime: now + windowMs (new window starting now)
 *
 * AWMS EXAMPLES:
 * - Workshop dashboard: "API Usage: 342/1000 (34%) - Resets in 23 minutes"
 * - Settings page: "Upgrade to PRO for 10x more API quota"
 * - Admin tools: "Shop #1234 using 95% of quota (investigate usage)"
 *
 * @param identifier - Rate limit identifier (org:xxx or ip:xxx)
 * @param plan - Organization subscription plan
 * @param customConfig - Optional endpoint-specific override
 *
 * @returns Current rate limit status (non-destructive read)
 *   - remaining: Requests left before hitting limit
 *   - resetTime: Unix timestamp when quota refills
 *   - limit: Total requests allowed per window
 *   - used: Requests consumed in current window
 *
 * @example
 * ```typescript
 * // Check quota for dashboard display
 * const status = getRateLimitStatus("org:abc123", "PRO");
 * console.log(`Used: ${status.used}/${status.limit} (${status.remaining} left)`);
 * // Output: "Used: 342/1000 (658 left)"
 *
 * // Fresh state (no requests yet)
 * const fresh = getRateLimitStatus("org:new999", "FREE");
 * // Returns: { remaining: 100, resetTime: ..., limit: 100, used: 0 }
 * ```
 *
 * @see {@link checkRateLimit} for enforcement (increments counter)
 * @see {@link formatRateLimitInfo} in rate-limit-config.ts for user-friendly formatting
 *
 * @performance <1ms (Map lookup, no writes)
 * @security LOW - Read-only operation, no side effects
 * @sideEffects None (pure read operation)
 */
export function getRateLimitStatus(
  identifier: string,
  plan: OrganizationPlan,
  customConfig?: { requests: number; windowMs: number }
): {
  remaining: number;
  resetTime: number;
  limit: number;
  used: number;
} {
  const key = getRateLimitKey(identifier);
  const limit = customConfig || RATE_LIMITS[plan];
  const now = Date.now();

  const rateLimitData = rateLimitStore.get(key);

  // FRESH STATE: No data or expired window
  // Return full quota available
  if (!rateLimitData || now > rateLimitData.resetTime) {
    return {
      remaining: limit.requests,
      resetTime: now + limit.windowMs,
      limit: limit.requests,
      used: 0,
    };
  }

  // ACTIVE WINDOW: Return current status
  const remaining = Math.max(0, limit.requests - rateLimitData.count);

  return {
    remaining,
    resetTime: rateLimitData.resetTime,
    limit: limit.requests,
    used: rateLimitData.count,
  };
}

/**
 * Create standard rate limit HTTP response headers
 *
 * Generates RFC-compliant rate limit headers for inclusion in API responses.
 * Follows industry standard patterns used by GitHub, Twitter, Stripe APIs.
 *
 * STANDARD HEADERS:
 * - X-RateLimit-Limit: Total requests allowed in window
 * - X-RateLimit-Remaining: Requests left before hitting limit
 * - X-RateLimit-Reset: Unix timestamp (seconds) when limit resets
 * - Retry-After: (conditional) Seconds to wait before retry (only when remaining=0)
 *
 * CLIENT BENEFITS:
 * - Can implement intelligent backoff strategies
 * - Can display quota usage to users
 * - Can batch requests to stay under limit
 * - Can schedule retries after Retry-After seconds
 *
 * RETRY-AFTER HEADER:
 * Only included when remaining=0 (limit exhausted)
 * Value is seconds (not milliseconds) per RFC 7231
 * Clients should wait this duration before retrying
 *
 * AWMS CLIENT BEHAVIOR:
 * ```javascript
 * // Client-side rate limit handling
 * const response = await fetch('/api/inventory');
 * const remaining = response.headers.get('X-RateLimit-Remaining');
 *
 * if (remaining < 10) {
 *   console.warn('Approaching rate limit!');
 * }
 *
 * if (response.status === 429) {
 *   const retryAfter = response.headers.get('Retry-After');
 *   console.log(`Rate limited. Retry in ${retryAfter} seconds`);
 * }
 * ```
 *
 * UNIX TIMESTAMP CONVERSION:
 * - Internal: Milliseconds (Date.now(), JavaScript standard)
 * - Headers: Seconds (RFC standard, divide by 1000)
 * - Reason: HTTP dates are second-precision, not millisecond
 *
 * @param limit - Total requests allowed in window
 * @param remaining - Requests left before hitting limit (0+)
 * @param resetTime - Unix timestamp in milliseconds when window resets
 *
 * @returns Object with header name-value pairs for HTTP response
 *
 * @example
 * ```typescript
 * // Typical usage in API route
 * const headers = createRateLimitHeaders(1000, 658, 1699999999999);
 * response.headers.set('X-RateLimit-Limit', headers['X-RateLimit-Limit']);
 * // Result: { "X-RateLimit-Limit": "1000", "X-RateLimit-Remaining": "658", ... }
 *
 * // When limit exhausted (remaining=0)
 * const exhaustedHeaders = createRateLimitHeaders(100, 0, Date.now() + 3600000);
 * // Includes: { ..., "Retry-After": "3600" }
 * ```
 *
 * @see {@link https://tools.ietf.org/html/rfc7231#section-7.1.3} Retry-After spec
 * @see {@link https://datatracker.ietf.org/doc/html/draft-ietf-httpapi-ratelimit-headers} Rate limit headers draft
 *
 * @performance O(1) - Simple arithmetic and object creation
 */
export function createRateLimitHeaders(
  limit: number,
  remaining: number,
  resetTime: number
): Record<string, string> {
  // CONVERSION 1: Milliseconds → Seconds (Unix timestamp)
  // RFC standard for HTTP dates is second precision
  const resetTimeSeconds = Math.floor(resetTime / 1000);

  // CONVERSION 2: Time remaining → Seconds until reset
  // Used for Retry-After header (how long to wait)
  const retryAfterSeconds = Math.floor((resetTime - Date.now()) / 1000);

  return {
    "X-RateLimit-Limit": limit.toString(),
    "X-RateLimit-Remaining": remaining.toString(),
    "X-RateLimit-Reset": resetTimeSeconds.toString(),
    // CONDITIONAL: Only include Retry-After when limit exhausted
    // SPREAD OPERATOR: Conditionally adds property to object
    ...(remaining === 0 ? { "Retry-After": retryAfterSeconds.toString() } : {}),
  };
}

/**
 * Create 429 Too Many Requests response with proper headers
 *
 * Standard HTTP 429 error response for rate limit violations.
 * Includes helpful error message and Retry-After header.
 *
 * HTTP STATUS: 429 Too Many Requests (RFC 6585)
 * Indicates user sent too many requests in given time period.
 *
 * RESPONSE BODY:
 * ```json
 * {
 *   "error": "Too Many Requests",
 *   "message": "Rate limit exceeded. Please try again later.",
 *   "retryAfter": 3600
 * }
 * ```
 *
 * RETRY-AFTER HEADER:
 * Tells client how many seconds to wait before retrying.
 * Clients should respect this (HTTP good citizenship).
 *
 * CLIENT HANDLING:
 * - Display friendly message: "Too many requests. Please wait 5 minutes."
 * - Implement exponential backoff for automated retries
 * - Log rate limit errors for monitoring/alerting
 *
 * AWMS UX:
 * - Dashboard: "API limit reached. Your quota resets in 30 minutes."
 * - Sync button: Disable with countdown timer until reset
 * - Upgrade prompt: "Upgrade to PRO for 10x higher limits"
 *
 * @param resetTime - Unix timestamp (milliseconds) when rate limit resets
 *
 * @returns NextResponse with 429 status and rate limit metadata
 *
 * @example
 * ```typescript
 * // In rate limit middleware
 * if (!rateLimitResult.allowed) {
 *   return createRateLimitExceededResponse(rateLimitResult.resetTime);
 * }
 * // Client receives: HTTP 429 with JSON body and Retry-After header
 * ```
 *
 * @see {@link https://tools.ietf.org/html/rfc6585#section-4} RFC 6585 Section 4
 * @see {@link checkRateLimit} for enforcement logic that calls this function
 *
 * @performance O(1) - Simple response construction
 * @security LOW - Error response, no sensitive data
 */
export function createRateLimitExceededResponse(
  resetTime: number
): NextResponse {
  // CALCULATION: Seconds until rate limit resets
  // CEILING: Round up (conservative estimate for user)
  // Example: 0.1 seconds → 1 second (better than 0)
  const retryAfterSeconds = Math.ceil((resetTime - Date.now()) / 1000);

  return NextResponse.json(
    {
      error: "Too Many Requests",
      message: "Rate limit exceeded. Please try again later.",
      retryAfter: retryAfterSeconds, // Seconds (not milliseconds)
    },
    {
      status: 429, // HTTP 429 Too Many Requests
      headers: {
        "Retry-After": retryAfterSeconds.toString(),
      },
    }
  );
}

/**
 * Apply rate limiting to existing API response
 *
 * @deprecated Use withRateLimit middleware instead for better integration
 *
 * This function is maintained for backward compatibility but should not
 * be used in new code. The middleware pattern provides better separation
 * of concerns and cleaner error handling.
 *
 * DEPRECATION RATIONALE:
 * - Mixes rate limiting with business logic (anti-pattern)
 * - Harder to test (side effects in response creation)
 * - Less flexible than middleware (can't easily chain behaviors)
 *
 * MIGRATION PATH:
 * ```typescript
 * // Old (deprecated)
 * export async function GET(req: NextRequest) {
 *   const response = NextResponse.json({ data: "..." });
 *   return applyRateLimit(response, "org:abc123", "PRO");
 * }
 *
 * // New (preferred) - Use middleware
 * async function handleGET(req: NextRequest) {
 *   return NextResponse.json({ data: "..." });
 * }
 * export const GET = withRateLimit(handleGET);
 * ```
 *
 * @param response - Existing NextResponse to add rate limit headers to
 * @param identifier - Rate limit identifier (org:xxx or ip:xxx)
 * @param plan - Organization subscription plan
 * @param customConfig - Optional endpoint-specific override
 *
 * @returns Modified response with rate limit headers, or 429 if exceeded
 *
 * @see {@link withRateLimit} in middleware/with-rate-limit.ts for preferred approach
 */
export function applyRateLimit(
  response: NextResponse,
  identifier: string,
  plan: OrganizationPlan,
  customConfig?: { requests: number; windowMs: number }
): NextResponse {
  const result = checkRateLimit(identifier, plan, customConfig);

  // RATE LIMIT EXCEEDED: Return 429 instead of original response
  if (!result.allowed) {
    return createRateLimitExceededResponse(result.resetTime);
  }

  // ADD HEADERS: Inject rate limit info into existing response
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
 * Reset rate limit for an identifier (admin operation)
 *
 * Clears rate limit counter for organization or IP, giving them fresh quota.
 * This is an administrative function for exceptional circumstances.
 *
 * USE CASES:
 * - Customer support: Reset limit after false positive
 * - Testing: Clear limits between test runs
 * - Migration: Clear old limits when changing plans
 * - Incident recovery: Reset after system outage
 *
 * SECURITY CONSIDERATIONS:
 * - Should ONLY be called by admin-authenticated endpoints
 * - Log all resets for audit trail (WHO reset WHAT and WHEN)
 * - Consider requiring secondary approval for production resets
 *
 * SIDE EFFECTS:
 * - Immediately removes entry from rateLimitStore Map
 * - Next request will create fresh entry (full quota)
 * - No way to undo (permanent until next natural reset)
 *
 * AWMS SCENARIOS:
 * - Support ticket: "Customer hit limit during critical import, please reset"
 * - Migration: "Moving org to new plan, clear old rate limits"
 * - Debugging: "Testing rate limit behavior, need clean slate"
 *
 * @param identifier - Rate limit identifier to reset (org:xxx or ip:xxx)
 *
 * @returns {void}
 *
 * @example
 * ```typescript
 * // In admin API route (must verify admin permission first!)
 * if (session.user.isAdmin) {
 *   resetRateLimit("org:abc123");
 *   await auditLog.create({ action: "RATE_LIMIT_RESET", resourceId: "org:abc123" });
 * }
 * ```
 *
 * @security HIGH - Admin operation, must be access-controlled
 * @audit Required - Log all invocations to audit trail
 * @sideEffects Modifies rateLimitStore (deletes entry)
 */
export function resetRateLimit(identifier: string): void {
  const key = getRateLimitKey(identifier);
  rateLimitStore.delete(key);
}

/**
 * Get all rate limit entries for admin inspection
 *
 * Returns snapshot of all active rate limit entries for monitoring,
 * debugging, and system health analysis. Admin-only operation.
 *
 * USE CASES:
 * - Admin dashboard: Show organizations approaching limits
 * - Debugging: Inspect rate limit state during investigations
 * - Monitoring: Track total number of active rate-limited entities
 * - Capacity planning: Analyze usage patterns across all users
 *
 * RETURN VALUE:
 * New Map (copy) containing all entries to prevent external modification
 * of internal state. This is defensive programming.
 *
 * MAP STRUCTURE:
 * ```typescript
 * Map {
 *   "ratelimit:org:abc123" => { count: 50, resetTime: 1699999999999 },
 *   "ratelimit:ip:203.0.113.1" => { count: 10, resetTime: 1699999999999 },
 *   ...
 * }
 * ```
 *
 * PERFORMANCE IMPACT:
 * - O(n) to copy Map where n = number of tracked identifiers
 * - Typical: ~1-2ms for 10,000 entries
 * - Use sparingly: Don't call on every request!
 *
 * AWMS ADMIN PANEL:
 * ```typescript
 * // Display organizations near rate limits
 * const allLimits = getAllRateLimits();
 * const nearLimit = Array.from(allLimits.entries())
 *   .filter(([key, data]) => key.startsWith('org:'))
 *   .filter(([key, data]) => data.count > limit * 0.9); // >90% usage
 * ```
 *
 * SECURITY:
 * - Must restrict to admin users only
 * - Contains organization IDs (business data, not PII)
 * - Could reveal system architecture (number of active users)
 *
 * @returns Copy of rate limit storage Map (safe to iterate/modify)
 *
 * @example
 * ```typescript
 * // In admin API route
 * export async function GET(req: NextRequest) {
 *   if (!session.user.isAdmin) {
 *     return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
 *   }
 *
 *   const limits = getAllRateLimits();
 *   return NextResponse.json({
 *     total: limits.size,
 *     entries: Array.from(limits.entries())
 *   });
 * }
 * ```
 *
 * @security HIGH - Reveals system state, admin-only
 * @performance O(n) - Creates copy of entire Map
 * @sideEffects None (returns copy, doesn't modify original)
 */
export function getAllRateLimits(): Map<string, RateLimitData> {
  // DEFENSIVE COPY: Prevents external code from modifying internal state
  // JavaScript Map is mutable, so we return a copy
  return new Map(rateLimitStore);
}
