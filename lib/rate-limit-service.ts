import { prismadb } from '@/lib/prisma'

export interface RateLimitConfig {
  requests: number
  windowSeconds: number
  perKey?: string // 'ip', 'user', 'api_key'
}

export class RateLimitService {
  /**
   * Check if request should be rate limited
   */
  static async checkRateLimit(
    identifier: string,
    config: RateLimitConfig
  ): Promise<{
    allowed: boolean
    remaining: number
    resetAt: Date
  }> {
    const now = new Date()
    const windowStart = new Date(now.getTime() - config.windowSeconds * 1000)

    // Count requests in window
    const count = await prismadb.rateLimitLog.count({
      where: {
        identifier,
        timestamp: {
          gte: windowStart,
          lte: now
        }
      }
    })

    const allowed = count < config.requests

    if (!allowed) {
      // Get the oldest request timestamp to calculate reset time
      const oldestRequest = await prismadb.rateLimitLog.findFirst({
        where: {
          identifier,
          timestamp: {
            gte: windowStart,
            lte: now
          }
        },
        orderBy: { timestamp: 'asc' }
      })

      const resetAt = oldestRequest
        ? new Date(oldestRequest.timestamp.getTime() + config.windowSeconds * 1000)
        : new Date()

      return {
        allowed: false,
        remaining: 0,
        resetAt
      }
    }

    // Log this request
    await prismadb.rateLimitLog.create({
      data: {
        identifier,
        timestamp: now
      }
    })

    const remaining = Math.max(0, config.requests - count - 1)
    const resetAt = new Date(now.getTime() + config.windowSeconds * 1000)

    return {
      allowed: true,
      remaining,
      resetAt
    }
  }

  /**
   * Cleanup old rate limit logs
   */
  static async cleanup(olderThanSeconds: number = 3600): Promise<number> {
    const cutoffTime = new Date(Date.now() - olderThanSeconds * 1000)

    const result = await prismadb.rateLimitLog.deleteMany({
      where: {
        timestamp: {
          lt: cutoffTime
        }
      }
    })

    return result.count
  }

  /**
   * Get rate limit status for identifier
   */
  static async getStatus(identifier: string, config: RateLimitConfig) {
    const now = new Date()
    const windowStart = new Date(now.getTime() - config.windowSeconds * 1000)

    const count = await prismadb.rateLimitLog.count({
      where: {
        identifier,
        timestamp: {
          gte: windowStart,
          lte: now
        }
      }
    })

    return {
      identifier,
      requestsInWindow: count,
      limit: config.requests,
      percentageUsed: (count / config.requests) * 100
    }
  }

  /**
   * Reset rate limit for identifier
   */
  static async reset(identifier: string): Promise<void> {
    await prismadb.rateLimitLog.deleteMany({
      where: { identifier }
    })
  }
}
