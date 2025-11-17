import { prisma } from './prisma-optimized'

/**
 * Circuit Breaker Pattern for Database Operations
 *
 * Prevents cascading failures by:
 * - Tracking failure count
 * - Opening circuit after threshold
 * - Attempting recovery after timeout
 */
class CircuitBreaker {
  private failureCount = 0
  private lastFailureTime = 0
  private readonly threshold = 5
  private readonly timeout = 30000 // 30 seconds
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        console.log('[Circuit Breaker] Attempting recovery (HALF_OPEN)')
        this.state = 'HALF_OPEN'
      } else {
        throw new Error('Circuit breaker is OPEN - database unavailable')
      }
    }

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess() {
    if (this.state === 'HALF_OPEN') {
      console.log('[Circuit Breaker] Recovery successful (CLOSED)')
    }
    this.failureCount = 0
    this.state = 'CLOSED'
  }

  private onFailure() {
    this.failureCount++
    this.lastFailureTime = Date.now()

    if (this.failureCount >= this.threshold) {
      console.error(`[Circuit Breaker] Threshold reached (${this.failureCount}/${this.threshold}) - Opening circuit`)
      this.state = 'OPEN'
    }
  }

  getStatus() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
    }
  }
}

export const dbCircuitBreaker = new CircuitBreaker()

/**
 * Usage Example:
 *
 * export async function getAccounts(organizationId: string) {
 *   return dbCircuitBreaker.execute(() =>
 *     prisma.crm_Accounts.findMany({
 *       where: { organizationId },
 *       take: 50,
 *     })
 *   )
 * }
 */
