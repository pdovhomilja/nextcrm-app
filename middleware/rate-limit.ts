/**
 * Rate Limiting Middleware
 * Redis-backed rate limiting with brute force protection
 *
 * Configuration:
 * - Auth endpoints: 5 requests/minute per IP
 * - API endpoints: 100 requests/minute per user
 * - Search: 10 requests/minute per user
 * - Brute force protection: 5 attempts, 15 min lockout
 */

import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, createRateLimitHeaders, createRateLimitExceededResponse } from '@/lib/rate-limit-redis'
import { getRateLimitConfig, getRateLimitIdentifier, RATE_LIMIT_BYPASS_PATTERNS } from '@/lib/rate-limit-config'
import { OrganizationPlan } from '@prisma/client'

// Brute force tracking (in-memory, per-instance)
const bruteForceAttempts = new Map<string, { count: number; firstAttempt: number }>()
const BRUTE_FORCE_WINDOW = 15 * 60 * 1000 // 15 minutes
const BRUTE_FORCE_THRESHOLD = 5

/**
 * Get client IP address from request
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')

  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  if (realIP) {
    return realIP
  }

  return 'unknown'
}

/**
 * Check and track brute force attempts
 */
function checkBruteForce(identifier: string): { blocked: boolean; remainingTime?: number } {
  const now = Date.now()
  const attempts = bruteForceAttempts.get(identifier)

  if (!attempts) {
    bruteForceAttempts.set(identifier, { count: 1, firstAttempt: now })
    return { blocked: false }
  }

  // Reset if window expired
  if (now - attempts.firstAttempt > BRUTE_FORCE_WINDOW) {
    bruteForceAttempts.set(identifier, { count: 1, firstAttempt: now })
    return { blocked: false }
  }

  // Increment attempts
  attempts.count++

  if (attempts.count >= BRUTE_FORCE_THRESHOLD) {
    const remainingTime = BRUTE_FORCE_WINDOW - (now - attempts.firstAttempt)
    return { blocked: true, remainingTime }
  }

  return { blocked: false }
}

/**
 * Rate limiting middleware
 */
export async function rateLimitMiddleware(
  request: NextRequest,
  organizationId: string | null,
  organizationPlan: OrganizationPlan = 'FREE',
  isAdmin: boolean = false
): Promise<NextResponse | null> {
  const pathname = request.nextUrl.pathname
  const clientIP = getClientIP(request)

  // Check if endpoint should bypass rate limiting
  if (RATE_LIMIT_BYPASS_PATTERNS.some((pattern) => pathname.startsWith(pattern))) {
    return null // No rate limit
  }

  // Get rate limit configuration for this endpoint
  const config = getRateLimitConfig(pathname, organizationPlan, isAdmin)

  if (!config) {
    return null // No rate limit for this endpoint/plan combination
  }

  // Get identifier for rate limiting
  const identifier = getRateLimitIdentifier(
    organizationId,
    clientIP,
    config.useIPFallback
  )

  // Check brute force for auth endpoints
  if (pathname.includes('/auth/')) {
    const bruteForceCheck = checkBruteForce(identifier)

    if (bruteForceCheck.blocked) {
      const retryAfterSeconds = Math.ceil((bruteForceCheck.remainingTime || 0) / 1000)
      const minutesRemaining = Math.ceil(retryAfterSeconds / 60)

      console.warn(
        `[Rate Limit] Brute force blocked: ${identifier} on ${pathname}`
      )

      return NextResponse.json(
        {
          error: 'Too Many Login Attempts',
          message: `Account temporarily locked due to multiple failed attempts. Please try again in ${minutesRemaining} minutes.`,
          retryAfter: retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfterSeconds.toString(),
          },
        }
      )
    }
  }

  // Check rate limit with Redis
  try {
    const result = await checkRateLimit(identifier, organizationPlan)

    if (!result.allowed) {
      console.warn(
        `[Rate Limit] Exceeded: ${identifier} on ${pathname} (${result.remaining}/${result.limit})`
      )

      return createRateLimitExceededResponse(result.resetTime)
    }

    // Rate limit passed - headers will be added by response middleware
    return null
  } catch (error) {
    console.error('[Rate Limit] Error checking rate limit:', error)
    // Fail-open: Allow request if rate limit check fails
    return null
  }
}

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  limit: number,
  remaining: number,
  resetTime: number
): NextResponse {
  const headers = createRateLimitHeaders(limit, remaining, resetTime)

  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  return response
}

/**
 * Cleanup brute force tracking (run periodically)
 */
export function cleanupBruteForceTracking() {
  const now = Date.now()
  let cleaned = 0

  for (const [key, value] of bruteForceAttempts.entries()) {
    if (now - value.firstAttempt > BRUTE_FORCE_WINDOW) {
      bruteForceAttempts.delete(key)
      cleaned++
    }
  }

  if (cleaned > 0) {
    console.log(`[Rate Limit] Cleaned up ${cleaned} expired brute force entries`)
  }
}

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupBruteForceTracking, 5 * 60 * 1000)
}
