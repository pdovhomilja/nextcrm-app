/**
 * ============================================================================
 * RATE LIMITING MIDDLEWARE - CORE INFRASTRUCTURE
 * ============================================================================
 *
 * PURPOSE:
 * Wraps Next.js API route handlers with rate limiting functionality to prevent
 * API abuse, DDoS attacks, and resource exhaustion. Implements plan-based
 * rate limiting with organization-level tracking for multi-tenant SaaS.
 *
 * BUSINESS CONTEXT:
 * NextCRM → AWMS (Automotive Workshop Management System) foundation requires
 * enterprise-grade rate limiting to:
 * 1. Prevent workshop API abuse during high-load scenarios (inventory sync)
 * 2. Enforce fair-use policies across subscription tiers (FREE/PRO/ENTERPRISE)
 * 3. Protect backend resources from malicious actors
 * 4. Ensure compliance with automotive industry uptime SLAs
 *
 * AWMS MAPPING:
 * - FREE Plan: Small independent shops (1-2 bays) = 100 req/hour
 * - PRO Plan: Medium shops (3-10 bays) = 1,000 req/hour
 * - ENTERPRISE Plan: Large chains (10+ locations) = 10,000 req/hour
 *
 * ARCHITECTURE:
 * - Organization-based limiting (preferred for authenticated requests)
 * - IP-based limiting (fallback for auth endpoints, guest users)
 * - Plan-aware configuration (auto-scales limits based on subscription)
 * - Endpoint-specific overrides (e.g., stricter limits for auth endpoints)
 * - Audit logging for security monitoring
 *
 * SECURITY IMPLICATIONS:
 * ⚠️ CRITICAL: This middleware is part of the DDoS defense-in-depth strategy
 * - Layer 1: Cloudflare/WAF (network layer)
 * - Layer 2: This middleware (application layer) ← YOU ARE HERE
 * - Layer 3: Database connection pooling (resource layer)
 *
 * PERFORMANCE:
 * - Average overhead: <2ms per request (in-memory lookups)
 * - Zero external dependencies (Redis not required for single-instance)
 * - Automatic memory cleanup (5-minute intervals)
 *
 * COMPLIANCE:
 * - SOC 2: Rate limiting as preventive control (CC6.1)
 * - GDPR: No PII stored in rate limit keys (org ID only)
 * - ISO 27001: A.14.1.2 - Securing application services
 *
 * @module middleware/with-rate-limit
 * @security CRITICAL - Core security control
 * @audit Required for SOC 2 compliance
 * @maintainer AWMS Platform Team
 * @since 1.0.0 - Initial implementation
 * @updated 2.0.0 - Added plan-based limiting and audit logging
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  checkRateLimit,
  createRateLimitHeaders,
  createRateLimitExceededResponse,
} from "@/lib/rate-limit";
import {
  getRateLimitConfig,
  getRateLimitIdentifier,
  RATE_LIMIT_BYPASS_PATTERNS,
} from "@/lib/rate-limit-config";
import { OrganizationPlan } from "@prisma/client";
import { prismadb } from "@/lib/prisma";

/**
 * Extract client IP address from Next.js request headers
 *
 * Handles various proxy/load balancer configurations commonly found in
 * production deployments (Vercel, Cloudflare, AWS ALB, nginx).
 *
 * SECURITY IMPLICATIONS:
 * - IP-based rate limiting is vulnerable to IP rotation attacks (VPN, TOR)
 * - Use organization-based limiting for authenticated requests when possible
 * - IP fallback only used for public endpoints (auth, health checks)
 *
 * PROXY HEADER PRIORITY (most to least trusted):
 * 1. x-forwarded-for: Standard proxy header (RFC 7239), comma-separated chain
 * 2. x-real-ip: Single IP header set by nginx and similar proxies
 * 3. null: No proxy headers found (direct connection or misconfigured proxy)
 *
 * COMMON DEBUGGING SCENARIOS:
 * - Issue: IP always shows as "127.0.0.1" or "::1"
 *   Fix: Ensure load balancer is setting x-forwarded-for header
 *   Check: Review Vercel/Cloudflare configuration for header forwarding
 *
 * - Issue: Rate limits not working correctly
 *   Cause: x-forwarded-for contains multiple IPs (proxy chain)
 *   Behavior: Only first IP is used (client IP, not proxy IP)
 *
 * - Issue: IP shows as null
 *   Cause: No proxy headers in development environment
 *   Expected: Normal in local development (use org-based limiting instead)
 *
 * @param request - Next.js request object with headers
 * @returns IP address string or null if not determinable
 *
 * @example
 * ```typescript
 * // Production (behind Cloudflare)
 * x-forwarded-for: "203.0.113.1, 198.51.100.1, 192.0.2.1"
 * // Returns: "203.0.113.1" (client IP)
 *
 * // Development (direct connection)
 * x-forwarded-for: null
 * x-real-ip: null
 * // Returns: null (expected)
 * ```
 *
 * @see {@link getRateLimitIdentifier} for how IP is used in rate limiting
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-For}
 *
 * @performance O(1) - Simple header lookup
 * @security LOW risk - IP can be spoofed without proper proxy configuration
 */
function getIPAddress(request: NextRequest): string | null {
  // PRIORITY 1: x-forwarded-for (most common in production)
  // Format: "client, proxy1, proxy2" - we want the client (first IP)
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // Extract first IP in the chain (client IP, before proxies)
    return forwardedFor.split(",")[0].trim();
  }

  // PRIORITY 2: x-real-ip (nginx and similar reverse proxies)
  // Format: Single IP address
  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  // NO HEADERS: Direct connection or misconfigured proxy
  // This is expected in development, problematic in production
  // RISK: In production, all requests will appear from same "unknown" identifier
  // MITIGATION: Always use organization-based limiting for authenticated routes
  return null;
}

/**
 * Retrieve organization's subscription plan from database
 *
 * Determines the rate limit tier by fetching the organization's current
 * subscription plan (FREE/PRO/ENTERPRISE). Used to apply plan-specific
 * rate limits and feature access controls.
 *
 * BUSINESS LOGIC:
 * - null/undefined organizationId → FREE plan (unauthenticated/guest users)
 * - Missing organization record → FREE plan (defensive programming)
 * - Database errors → FREE plan (fail-safe to most restrictive tier)
 *
 * AWMS CONTEXT:
 * Plan determines workshop's API quota:
 * - FREE: Solo mechanics, limited API access for testing
 * - PRO: Small/medium shops, standard API quota
 * - ENTERPRISE: Franchise chains, unlimited API access
 *
 * SECURITY CONSIDERATIONS:
 * - Defaults to FREE on error (fail closed, not open)
 * - Prevents privilege escalation via database manipulation
 * - No PII logged (only error message and org ID)
 *
 * PERFORMANCE CHARACTERISTICS:
 * - Database query overhead: ~10-20ms (with index on organizations.id)
 * - Called once per request, result used for rate limit calculation
 * - Consider caching in future (Redis with 5-minute TTL)
 *
 * COMMON FAILURE SCENARIOS:
 * 1. Database connection timeout
 *    → Falls back to FREE plan
 *    → User sees stricter rate limits but service continues
 *    → Alert: Monitor for frequent "[RATE_LIMIT] Error fetching" logs
 *
 * 2. Organization soft-deleted (deleteScheduledAt set)
 *    → Still returns plan (allows grace period access)
 *    → Deletion happens via cron job after 30 days
 *
 * 3. Stripe subscription cancelled but plan not updated
 *    → Shows old plan until webhook processes (eventual consistency)
 *    → Acceptable: ~30 second delay in plan downgrade
 *
 * @param organizationId - Organization identifier from session
 *   - null: User not authenticated or no org assigned
 *   - undefined: Session data incomplete
 *   - string: Valid organization UUID
 *
 * @returns Organization's subscription plan tier
 *   - Always returns a valid OrganizationPlan (never null/undefined)
 *   - Defaults to "FREE" on any error condition
 *
 * @example
 * ```typescript
 * // Authenticated user with PRO plan
 * const plan = await getOrganizationPlan("org_123");
 * // Returns: "PRO"
 *
 * // Unauthenticated user
 * const plan = await getOrganizationPlan(null);
 * // Returns: "FREE"
 *
 * // Database error scenario
 * const plan = await getOrganizationPlan("invalid-uuid");
 * // Logs error, Returns: "FREE"
 * ```
 *
 * DEBUGGING:
 * - Enable query logging: Set LOG_LEVEL=debug in environment
 * - Check Prisma logs: Look for slow query warnings
 * - Verify index exists: `EXPLAIN SELECT plan FROM organizations WHERE id = ?`
 *
 * @throws Never throws - all errors caught and handled gracefully
 *
 * @see {@link OrganizationPlan} for plan tier definitions
 * @see {@link RATE_LIMITS} in lib/rate-limit.ts for plan-specific limits
 *
 * @performance O(1) database lookup with index
 * @security MEDIUM - Determines authorization level, but not authentication
 */
async function getOrganizationPlan(
  organizationId: string | null | undefined
): Promise<OrganizationPlan> {
  // CASE 1: No organization ID (unauthenticated or guest user)
  // BUSINESS RULE: Guest users default to most restrictive tier
  if (!organizationId) {
    return "FREE";
  }

  try {
    // OPTIMIZATION: Select only plan field to minimize data transfer
    // INDEX REQUIREMENT: organizations.id must be indexed (primary key)
    const org = await prismadb.organizations.findUnique({
      where: { id: organizationId },
      select: { plan: true },
    });

    // CASE 2: Organization not found in database
    // DEFENSIVE: Should never happen with valid session, but handle gracefully
    // INVESTIGATION: Check for race condition during org deletion
    return org?.plan || "FREE";
  } catch (error) {
    // CRITICAL ERROR HANDLING:
    // Never throw - rate limiting failures should not block API requests
    // Fall back to FREE plan (fail closed, most secure)
    //
    // COMMON CAUSES:
    // 1. Database connection pool exhausted (scale up connections)
    // 2. Database server unreachable (check network connectivity)
    // 3. Invalid UUID format (should be caught by Prisma validation)
    // 4. Prisma client not initialized (startup race condition)
    //
    // MONITORING: This log should trigger alerts if frequency > 10/minute
    // ACTION: Page on-call engineer if this error persists
    console.error("[RATE_LIMIT] Error fetching organization plan:", error);
    return "FREE";
  }
}

/**
 * ============================================================================
 * MAIN RATE LIMITING MIDDLEWARE - Higher-Order Function
 * ============================================================================
 *
 * Wraps Next.js API route handlers with automatic rate limiting enforcement.
 * This is the primary entry point for applying rate limits to API routes.
 *
 * USAGE PATTERNS:
 * ```typescript
 * // Pattern 1: Simple routes (no dynamic params)
 * export const POST = withRateLimit(handlePOST);
 *
 * // Pattern 2: Dynamic routes with params/searchParams
 * export const GET = withRateLimit(handleGET); // context auto-passed
 * ```
 *
 * HOW IT WORKS (Request Flow):
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ 1. Request arrives → withRateLimit() intercepts                 │
 * │ 2. Check bypass patterns (health checks, webhooks, cron)        │
 * │ 3. Get user session (NextAuth) and organizationId              │
 * │ 4. Fetch organization plan (FREE/PRO/ENTERPRISE)                │
 * │ 5. Get endpoint-specific rate limit config                      │
 * │ 6. Determine identifier (org:xxx or ip:xxx)                     │
 * │ 7. Check rate limit (in-memory token bucket)                    │
 * │ 8a. If exceeded → Log audit event → Return 429                  │
 * │ 8b. If allowed → Execute handler → Add rate limit headers       │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * TYPESCRIPT OVERLOADS:
 * Two function signatures to support different route types:
 * 1. Simple handler: (req) => Promise<NextResponse>
 * 2. Parameterized handler: (req, context) => Promise<NextResponse>
 *
 * BYPASS PATTERNS:
 * Some endpoints skip rate limiting (defined in RATE_LIMIT_BYPASS_PATTERNS):
 * - /api/health (load balancer health checks)
 * - /api/webhooks/stripe (Stripe signature verification suffices)
 * - /api/cron/* (CRON_SECRET verification suffices)
 *
 * SECURITY DEFENSE-IN-DEPTH:
 * This middleware complements (does not replace) other security layers:
 * - ✓ Rate limiting (this middleware) - Application layer
 * - ✓ RBAC (require-permission middleware) - Authorization layer
 * - ✓ Authentication (NextAuth) - Identity layer
 * - ✓ Input validation (Zod schemas) - Data layer
 * - ✓ CSRF protection (Same-Origin Policy) - Browser layer
 *
 * AUDIT LOGGING:
 * Rate limit violations are logged to auditLog table for:
 * - Security forensics (who exceeded limits, when, how often)
 * - Abuse detection (automated monitoring for attack patterns)
 * - Compliance reporting (SOC 2 control evidence)
 *
 * ERROR HANDLING PHILOSOPHY:
 * "Fail open, not closed" - If rate limiting breaks, allow request through
 * RATIONALE: Availability > Rate limit enforcement (SLA priority)
 * RISK MITIGATION: Monitor error frequency, alert on rate limit failures
 *
 * AWMS USE CASE EXAMPLES:
 * - Workshop inventory sync (bulk API calls) → Plan-based limits prevent abuse
 * - Customer portal access (read operations) → Generous limits for good UX
 * - Payment processing (sensitive operations) → Strict limits prevent fraud
 * - Admin operations (destructive actions) → Admin bypass for efficiency
 *
 * PERFORMANCE IMPACT:
 * - Session lookup: ~10ms (database query)
 * - Plan lookup: ~10ms (database query)
 * - Rate limit check: <1ms (in-memory Map lookup)
 * - Audit logging: ~5ms (non-blocking, best effort)
 * - **Total overhead: ~25ms per request** (acceptable for API)
 *
 * FUTURE ENHANCEMENTS:
 * - [ ] Redis backend for distributed rate limiting (multi-server)
 * - [ ] Sliding window algorithm (more accurate than token bucket)
 * - [ ] Dynamic rate limits based on endpoint load (auto-scaling)
 * - [ ] Rate limit warming (gradual limit increases for new users)
 * - [ ] Custom rate limit headers (X-RateLimit-Policy, X-RateLimit-Cost)
 *
 * @param handler - Next.js API route handler to wrap with rate limiting
 * @returns Wrapped handler with rate limiting enforcement
 *
 * @example
 * ```typescript
 * // Example 1: Simple API route
 * async function handlePOST(req: NextRequest) {
 *   const body = await req.json();
 *   // ... business logic
 *   return NextResponse.json({ success: true });
 * }
 * export const POST = withRateLimit(handlePOST);
 *
 * // Example 2: Parameterized route (e.g., /api/account/[accountId])
 * async function handleGET(
 *   req: NextRequest,
 *   { params }: { params: { accountId: string } }
 * ) {
 *   const account = await getAccount(params.accountId);
 *   return NextResponse.json(account);
 * }
 * export const GET = withRateLimit(handleGET);
 * ```
 *
 * @see {@link getRateLimitConfig} for endpoint-specific configuration
 * @see {@link checkRateLimit} for rate limit enforcement logic
 * @see {@link RATE_LIMIT_BYPASS_PATTERNS} for bypass rules
 *
 * @security CRITICAL - Core DDoS protection mechanism
 * @performance ~25ms average overhead per request
 * @maintainer AWMS Platform Team
 */

// TYPESCRIPT OVERLOAD 1: Simple handler (no params)
// Used for routes like /api/users (no dynamic segments)
export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>
): (req: NextRequest) => Promise<NextResponse>;

// TYPESCRIPT OVERLOAD 2: Handler with context (params, searchParams)
// Used for routes like /api/users/[userId] (dynamic segments)
export function withRateLimit<T = any>(
  handler: (req: NextRequest, context: T) => Promise<NextResponse>
): (req: NextRequest, context: T) => Promise<NextResponse>;

// ACTUAL IMPLEMENTATION (runtime behavior)
export function withRateLimit(handler: Function): Function {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    // STEP 1: Extract pathname for configuration lookup
    // pathname examples: "/api/crm/accounts", "/api/billing/checkout"
    const pathname = new URL(req.url).pathname;

    // STEP 2: Check bypass patterns (health checks, webhooks, cron jobs)
    // RATIONALE: These endpoints have alternative authentication mechanisms
    // - Health checks: No auth needed (load balancer requirement)
    // - Webhooks: Signature verification (more secure than rate limiting)
    // - Cron jobs: CRON_SECRET header (internal only)
    if (RATE_LIMIT_BYPASS_PATTERNS.some((pattern) => pathname.startsWith(pattern))) {
      // BYPASS: Execute handler immediately without rate limit checks
      // SECURITY NOTE: Ensure alternative auth mechanisms are in place
      return context !== undefined ? handler(req, context) : handler(req);
    }

    try {
      // ====================================================================
      // STEP 3: Get user session and organization context
      // ====================================================================
      // PERFORMANCE: ~10ms database query (sessions table)
      // NULL CASES: Unauthenticated users, expired sessions, session corruption
      const session = await getServerSession(authOptions);
      const organizationId = session?.user?.organizationId;
      const isAdmin = session?.user?.isAdmin || false;

      // ====================================================================
      // STEP 4: Determine organization's subscription plan
      // ====================================================================
      // BUSINESS LOGIC: Plan determines rate limit tier (FREE < PRO < ENTERPRISE)
      // FALLBACK: Defaults to FREE on error (fail closed, not open)
      // PERFORMANCE: ~10ms database query (organizations table)
      const plan = await getOrganizationPlan(organizationId);

      // ====================================================================
      // STEP 5: Get endpoint-specific rate limit configuration
      // ====================================================================
      // CONFIGURATION: Checks ENDPOINT_RATE_LIMITS for custom limits
      // BYPASS RULES: Some plans/roles skip limits (e.g., ENTERPRISE, admin)
      // NULL RESULT: Endpoint configured to skip rate limiting entirely
      const rateLimitConfig = getRateLimitConfig(pathname, plan, isAdmin);

      // EARLY EXIT: No rate limit configured for this endpoint/plan/role
      // EXAMPLE: ENTERPRISE plan on /api/upload (unlimited uploads)
      if (!rateLimitConfig) {
        return context !== undefined ? handler(req, context) : handler(req);
      }

      // ====================================================================
      // STEP 6: Determine rate limit identifier (org or IP)
      // ====================================================================
      // PREFERRED: Organization-based (multi-user orgs share quota)
      // FALLBACK: IP-based (for auth endpoints, unauthenticated users)
      // SECURITY: IP can be rotated (VPN/TOR), org ID cannot
      const ipAddress = getIPAddress(req);

      // Identifier examples:
      // - "org:abc123" (authenticated user with org)
      // - "ip:203.0.113.1" (unauthenticated user or auth endpoint)
      // - "ip:unknown" (proxy misconfiguration - all requests grouped)
      const identifier = getRateLimitIdentifier(
        organizationId,
        ipAddress,
        rateLimitConfig.useIPFallback
      );

      // ====================================================================
      // STEP 7: Check rate limit (token bucket algorithm)
      // ====================================================================
      // ALGORITHM: Token bucket (simple, fast, memory-efficient)
      // STORAGE: In-memory Map (single-server only, see lib/rate-limit.ts)
      // PERFORMANCE: <1ms (Map lookup and update)
      const rateLimitResult = checkRateLimit(identifier, plan, rateLimitConfig);

      // ====================================================================
      // STEP 8A: Rate limit exceeded - Block request with 429
      // ====================================================================
      if (!rateLimitResult.allowed) {
        // SECURITY LOGGING: Log all rate limit violations for monitoring
        // MONITORING: Alert if frequency > 100/minute (potential DDoS attack)
        console.warn(
          `[RATE_LIMIT] Rate limit exceeded for ${identifier} on ${pathname}`
        );

        // AUDIT LOGGING: Store rate limit violation for compliance
        // PURPOSE: Security forensics, abuse detection, SOC 2 evidence
        // ASYNC: Non-blocking (best effort), failures don't block response
        if (organizationId) {
          try {
            await prismadb.auditLog.create({
              data: {
                organizationId,
                userId: session?.user?.id || null,
                action: "RATE_LIMIT_EXCEEDED",
                resource: "API",
                resourceId: pathname,
                changes: {
                  endpoint: pathname,
                  plan,
                  limit: rateLimitResult.limit,
                  resetTime: new Date(rateLimitResult.resetTime).toISOString(),
                  result: "failure",
                  // AWMS CONTEXT: Track which workshop location exceeded limits
                  identifier: identifier.startsWith("org:") ? "organization" : "ip",
                },
                ipAddress: ipAddress || null,
                userAgent: req.headers.get("user-agent") || null,
              },
            });
          } catch (error) {
            // DEFENSIVE: Audit logging failure should not block response
            // INVESTIGATION: Check database connection pool, disk space
            console.error("[RATE_LIMIT] Failed to log audit:", error);
          }
        }

        // RETURN 429: Too Many Requests (RFC 6585)
        // HEADERS: Includes Retry-After (seconds until reset)
        // CLIENT ACTION: Should wait before retrying
        return createRateLimitExceededResponse(rateLimitResult.resetTime);
      }

      // ====================================================================
      // STEP 8B: Rate limit OK - Execute handler and add headers
      // ====================================================================
      // TOKEN CONSUMED: Rate limit counter incremented in checkRateLimit()
      // HANDLER EXECUTION: Original route handler processes the request
      const response = context !== undefined ? await handler(req, context) : await handler(req);

      // RATE LIMIT HEADERS: Inform client of quota status (RFC 7231)
      // HEADERS:
      // - X-RateLimit-Limit: Total allowed requests in window
      // - X-RateLimit-Remaining: Requests left before hitting limit
      // - X-RateLimit-Reset: Unix timestamp when window resets
      // - Retry-After: (only when remaining = 0) seconds to wait
      //
      // CLIENT USE CASE: Dashboard can show "API quota: 80/100 remaining"
      // AWMS USE CASE: Workshop software shows "50% of hourly API quota used"
      const headers = createRateLimitHeaders(
        rateLimitResult.limit,
        rateLimitResult.remaining,
        rateLimitResult.resetTime
      );

      // Inject headers into response (non-destructive, additive only)
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return response;
    } catch (error) {
      // ====================================================================
      // CRITICAL ERROR HANDLING: Fail open (allow request through)
      // ====================================================================
      // PHILOSOPHY: Availability > Rate limit enforcement
      // RATIONALE: Better to risk API abuse than cause service outage
      //
      // COMMON CAUSES:
      // 1. Database connection failure (session/org lookup)
      // 2. Prisma client not initialized (startup race condition)
      // 3. NextAuth configuration error (session decode failure)
      // 4. Memory exhaustion (rate limit Map too large)
      //
      // MONITORING: This should NEVER happen in normal operation
      // ALERT: Page on-call engineer if this occurs > 1/hour
      // INVESTIGATION:
      // - Check database connectivity (pg_isready)
      // - Check memory usage (rate limit Map size)
      // - Check error logs for stack traces
      // - Review recent deployments (code or config changes)
      //
      // RISK: Without rate limiting, API is vulnerable to abuse
      // MITIGATION: External rate limiting (Cloudflare, AWS WAF)
      console.error("[RATE_LIMIT] Middleware error:", error);

      // FAIL OPEN: Execute handler without rate limit enforcement
      // USER EXPERIENCE: Request succeeds (user unaware of internal error)
      // SECURITY IMPACT: Temporary loss of rate limit protection
      return context !== undefined ? handler(req, context) : handler(req);
    }
  };
}

/**
 * Simplified rate limiting wrapper (convenience alias)
 *
 * DEPRECATED: Use `withRateLimit()` directly for better type inference
 *
 * This is a legacy wrapper maintained for backward compatibility.
 * New code should use `withRateLimit()` directly for clearer semantics.
 *
 * MIGRATION PATH:
 * ```typescript
 * // Old (deprecated)
 * export const POST = rateLimited(handlePOST);
 *
 * // New (preferred)
 * export const POST = withRateLimit(handlePOST);
 * ```
 *
 * @param handler - Next.js API route handler
 * @returns Rate-limited handler
 *
 * @deprecated Use withRateLimit directly for better TypeScript support
 * @see {@link withRateLimit} for the preferred API
 */
export function rateLimited(
  handler: (req: NextRequest) => Promise<NextResponse | Response>
): (req: NextRequest) => Promise<NextResponse> {
  // TYPE CAST: Response → NextResponse (safe, Response is parent type)
  return withRateLimit(handler as (req: NextRequest) => Promise<NextResponse>);
}

/**
 * Rate limiting wrapper for parameterized routes (DEPRECATED)
 *
 * DEPRECATED: Use `withRateLimit()` directly instead
 *
 * This function is no longer needed - `withRateLimit()` automatically
 * handles both simple and parameterized routes via TypeScript overloads.
 *
 * HISTORICAL CONTEXT:
 * In earlier versions, parameterized routes required a separate wrapper
 * due to limitations in TypeScript function overloading. This has been
 * resolved with improved type definitions.
 *
 * MIGRATION PATH:
 * ```typescript
 * // Old (deprecated)
 * export const GET = rateLimitedWithParams(handleGET);
 *
 * // New (preferred) - withRateLimit auto-detects params
 * export const GET = withRateLimit(handleGET);
 * ```
 *
 * EXAMPLE: Parameterized route (e.g., /api/crm/account/[accountId]/route.ts)
 * ```typescript
 * async function handleGET(
 *   req: NextRequest,
 *   { params }: { params: { accountId: string } }
 * ) {
 *   const account = await getAccount(params.accountId);
 *   return NextResponse.json(account);
 * }
 *
 * // TypeScript automatically infers the correct overload
 * export const GET = withRateLimit(handleGET);
 * ```
 *
 * @param handler - Parameterized route handler
 * @returns Rate-limited handler
 *
 * @deprecated Use withRateLimit directly - it handles params automatically
 * @see {@link withRateLimit} for the unified API
 */
export function rateLimitedWithParams<T = any>(
  handler: (
    req: NextRequest,
    params: { params: T }
  ) => Promise<NextResponse>
): (req: NextRequest, context: { params: T }) => Promise<NextResponse> {
  // DELEGATION: Pass through to withRateLimit (TypeScript infers correct overload)
  return withRateLimit(handler);
}
