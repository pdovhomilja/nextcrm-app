/**
 * Unit Tests: Rate Limiting
 * Tests the token bucket rate limiting implementation
 */

import {
  RATE_LIMITS,
  checkRateLimit,
  getRateLimitStatus,
  createRateLimitHeaders,
  resetRateLimit,
} from '@/lib/rate-limit'
import { OrganizationPlan } from '@prisma/client'

describe('Rate Limiting', () => {
  // FIXED: Comprehensive cleanup - reset ALL organizations used in tests
  // Prevents state pollution between tests that caused 3 test failures
  beforeEach(() => {
    // Reset all test organizations
    resetRateLimit('test-org-1')
    resetRateLimit('test-org-2')
    resetRateLimit('test-org-3')
    resetRateLimit('test-org-free')
    resetRateLimit('test-org-pro')
    resetRateLimit('test-org-enterprise')
    resetRateLimit('test-org-status')
    resetRateLimit('test-org-reset')
    resetRateLimit('test-org-rapid')
    resetRateLimit('org-1')
    resetRateLimit('org-2')
    resetRateLimit('org-a')
    resetRateLimit('org-b')
    resetRateLimit('org-c')
  })

  // FIXED: Additional cleanup after each test to ensure clean state
  afterEach(() => {
    // Clean up any leftover state
    resetRateLimit('test-org-free')
    resetRateLimit('test-org-pro')
    resetRateLimit('test-org-enterprise')
    resetRateLimit('org-1')
    resetRateLimit('org-2')
  })

  describe('Rate Limit Configuration', () => {
    it('should have correct FREE plan limits', () => {
      expect(RATE_LIMITS.FREE.requests).toBe(100)
      expect(RATE_LIMITS.FREE.windowMs).toBe(60 * 60 * 1000) // 1 hour
    })

    it('should have correct PRO plan limits', () => {
      expect(RATE_LIMITS.PRO.requests).toBe(1000)
      expect(RATE_LIMITS.PRO.windowMs).toBe(60 * 60 * 1000) // 1 hour
    })

    it('should have correct ENTERPRISE plan limits', () => {
      expect(RATE_LIMITS.ENTERPRISE.requests).toBe(10000)
      expect(RATE_LIMITS.ENTERPRISE.windowMs).toBe(60 * 60 * 1000) // 1 hour
    })

    it('should have higher limits for higher plans', () => {
      expect(RATE_LIMITS.PRO.requests).toBeGreaterThan(RATE_LIMITS.FREE.requests)
      expect(RATE_LIMITS.ENTERPRISE.requests).toBeGreaterThan(RATE_LIMITS.PRO.requests)
    })
  })

  describe('checkRateLimit - FREE Plan', () => {
    const plan: OrganizationPlan = 'FREE'
    const orgId = 'test-org-free'

    it('should allow first request', () => {
      const result = checkRateLimit(orgId, plan)

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(99) // 100 - 1
      expect(result.limit).toBe(100)
      expect(result.resetTime).toBeGreaterThan(Date.now())
    })

    it('should decrement remaining count on each request', () => {
      const result1 = checkRateLimit(orgId, plan)
      expect(result1.remaining).toBe(99)

      const result2 = checkRateLimit(orgId, plan)
      expect(result2.remaining).toBe(98)

      const result3 = checkRateLimit(orgId, plan)
      expect(result3.remaining).toBe(97)
    })

    it('should block requests after limit exceeded', () => {
      // Make 100 requests (the limit)
      for (let i = 0; i < 100; i++) {
        checkRateLimit(orgId, plan)
      }

      // 101st request should be blocked
      const result = checkRateLimit(orgId, plan)
      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it('should maintain separate counters per organization', () => {
      const org1 = 'org-1'
      const org2 = 'org-2'

      const result1 = checkRateLimit(org1, plan)
      const result2 = checkRateLimit(org2, plan)

      expect(result1.remaining).toBe(99)
      expect(result2.remaining).toBe(99)

      // Make more requests for org1
      checkRateLimit(org1, plan)
      checkRateLimit(org1, plan)

      const result1Final = checkRateLimit(org1, plan)
      const result2Final = checkRateLimit(org2, plan)

      expect(result1Final.remaining).toBe(96) // 100 - 4
      expect(result2Final.remaining).toBe(98) // 100 - 2
    })
  })

  describe('checkRateLimit - PRO Plan', () => {
    const plan: OrganizationPlan = 'PRO'
    const orgId = 'test-org-pro'

    it('should have higher limit than FREE', () => {
      const result = checkRateLimit(orgId, plan)

      expect(result.limit).toBe(1000)
      expect(result.remaining).toBe(999)
    })

    it('should allow 1000 requests', () => {
      let lastResult

      for (let i = 0; i < 1000; i++) {
        lastResult = checkRateLimit(orgId, plan)
        expect(lastResult.allowed).toBe(true)
      }

      // 1001st request should be blocked
      const blockedResult = checkRateLimit(orgId, plan)
      expect(blockedResult.allowed).toBe(false)
      expect(blockedResult.remaining).toBe(0)
    })
  })

  describe('checkRateLimit - ENTERPRISE Plan', () => {
    const plan: OrganizationPlan = 'ENTERPRISE'
    const orgId = 'test-org-enterprise'

    it('should have highest limit', () => {
      const result = checkRateLimit(orgId, plan)

      expect(result.limit).toBe(10000)
      expect(result.remaining).toBe(9999)
    })
  })

  describe('getRateLimitStatus', () => {
    const plan: OrganizationPlan = 'FREE'
    const orgId = 'test-org-status'

    it('should return full limit initially', () => {
      const status = getRateLimitStatus(orgId, plan)

      expect(status.remaining).toBe(100)
      expect(status.limit).toBe(100)
      expect(status.used).toBe(0)
      expect(status.resetTime).toBeGreaterThan(Date.now())
    })

    it('should NOT increment counter', () => {
      const status1 = getRateLimitStatus(orgId, plan)
      const status2 = getRateLimitStatus(orgId, plan)

      expect(status1.remaining).toBe(status2.remaining)
      expect(status1.used).toBe(status2.used)
    })

    it('should reflect actual usage after requests', () => {
      checkRateLimit(orgId, plan)
      checkRateLimit(orgId, plan)
      checkRateLimit(orgId, plan)

      const status = getRateLimitStatus(orgId, plan)

      expect(status.used).toBe(3)
      expect(status.remaining).toBe(97)
      expect(status.limit).toBe(100)
    })
  })

  describe('createRateLimitHeaders', () => {
    it('should create correct headers', () => {
      const limit = 100
      const remaining = 50
      const resetTime = Date.now() + 3600000 // 1 hour from now

      const headers = createRateLimitHeaders(limit, remaining, resetTime)

      expect(headers['X-RateLimit-Limit']).toBe('100')
      expect(headers['X-RateLimit-Remaining']).toBe('50')
      expect(headers['X-RateLimit-Reset']).toBeTruthy()
      expect(headers['Retry-After']).toBeUndefined()
    })

    it('should include Retry-After when limit exceeded', () => {
      const limit = 100
      const remaining = 0
      const resetTime = Date.now() + 3600000

      const headers = createRateLimitHeaders(limit, remaining, resetTime)

      expect(headers['X-RateLimit-Remaining']).toBe('0')
      expect(headers['Retry-After']).toBeTruthy()
      expect(parseInt(headers['Retry-After']!)).toBeGreaterThan(0)
    })
  })

  describe('resetRateLimit', () => {
    const plan: OrganizationPlan = 'FREE'
    const orgId = 'test-org-reset'

    it('should reset organization rate limit', () => {
      // Use up some requests
      checkRateLimit(orgId, plan)
      checkRateLimit(orgId, plan)
      checkRateLimit(orgId, plan)

      const statusBefore = getRateLimitStatus(orgId, plan)
      expect(statusBefore.used).toBe(3)

      // Reset
      resetRateLimit(orgId)

      const statusAfter = getRateLimitStatus(orgId, plan)
      expect(statusAfter.used).toBe(0)
      expect(statusAfter.remaining).toBe(100)
    })

    it('should not affect other organizations', () => {
      const org1 = 'org-1'
      const org2 = 'org-2'

      // FIXED: Reset both orgs before test to ensure clean state
      resetRateLimit(org1)
      resetRateLimit(org2)

      // Make requests to both orgs
      checkRateLimit(org1, plan)
      checkRateLimit(org1, plan)
      checkRateLimit(org2, plan)

      // Reset org1
      resetRateLimit(org1)

      // Check final state
      const status1 = getRateLimitStatus(org1, plan)
      const status2 = getRateLimitStatus(org2, plan)

      expect(status1.used).toBe(0)  // org1 was reset
      expect(status2.used).toBe(1)  // org2 should still have 1 request
    })
  })

  describe('Edge Cases', () => {
    it('should handle rapid successive requests', () => {
      const plan: OrganizationPlan = 'FREE'
      const orgId = 'test-org-rapid'

      const results = []
      for (let i = 0; i < 10; i++) {
        results.push(checkRateLimit(orgId, plan))
      }

      results.forEach((result, index) => {
        expect(result.remaining).toBe(100 - (index + 1))
      })
    })

    it('should handle concurrent organization requests', () => {
      const plan: OrganizationPlan = 'PRO'
      const orgs = ['org-a', 'org-b', 'org-c']

      orgs.forEach(org => {
        const result = checkRateLimit(org, plan)
        expect(result.allowed).toBe(true)
        expect(result.remaining).toBe(999)
      })
    })
  })
})
