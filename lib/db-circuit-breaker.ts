/**
 * Circuit Breaker Pattern for Database Operations
 *
 * Prevents cascading failures by:
 * - Tracking failure count
 * - Opening circuit after threshold
 * - Attempting recovery after timeout
 * - Exponential backoff retry logic
 * - Automatic failover with comprehensive logging
 */

interface CircuitBreakerConfig {
  threshold?: number
  timeout?: number
  maxRetries?: number
  initialBackoff?: number
  maxBackoff?: number
  backoffMultiplier?: number
}

interface CircuitBreakerStatus {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN'
  failureCount: number
  lastFailureTime: number
  successCount: number
  totalRequests: number
  lastError?: string
}

class CircuitBreaker {
  private failureCount = 0
  private successCount = 0
  private totalRequests = 0
  private lastFailureTime = 0
  private lastError?: string
  private readonly threshold: number
  private readonly timeout: number
  private readonly maxRetries: number
  private readonly initialBackoff: number
  private readonly maxBackoff: number
  private readonly backoffMultiplier: number
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'

  constructor(config: CircuitBreakerConfig = {}) {
    this.threshold = config.threshold || 5
    this.timeout = config.timeout || 30000 // 30 seconds
    this.maxRetries = config.maxRetries || 3
    this.initialBackoff = config.initialBackoff || 1000 // 1 second
    this.maxBackoff = config.maxBackoff || 32000 // 32 seconds
    this.backoffMultiplier = config.backoffMultiplier || 2
  }

  /**
   * Execute operation with circuit breaker protection and exponential backoff retry
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    this.totalRequests++

    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        console.log('[Circuit Breaker] Attempting recovery (HALF_OPEN)')
        this.state = 'HALF_OPEN'
      } else {
        const timeRemaining = Math.ceil((this.timeout - (Date.now() - this.lastFailureTime)) / 1000)
        throw new Error(
          `Circuit breaker is OPEN - database unavailable. Retry in ${timeRemaining}s`
        )
      }
    }

    return this.executeWithRetry(operation, 0)
  }

  /**
   * Execute operation with exponential backoff retry logic
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    attempt: number
  ): Promise<T> {
    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.lastError = errorMessage

      // If we've reached max retries, fail permanently
      if (attempt >= this.maxRetries) {
        console.error(
          `[Circuit Breaker] Max retries (${this.maxRetries}) reached. Failing operation.`
        )
        this.onFailure()
        throw error
      }

      // Calculate backoff delay with exponential increase
      const backoffDelay = Math.min(
        this.initialBackoff * Math.pow(this.backoffMultiplier, attempt),
        this.maxBackoff
      )

      console.warn(
        `[Circuit Breaker] Attempt ${attempt + 1}/${this.maxRetries + 1} failed: ${errorMessage}. Retrying in ${backoffDelay}ms...`
      )

      // Wait for backoff period
      await this.sleep(backoffDelay)

      // Retry the operation
      return this.executeWithRetry(operation, attempt + 1)
    }
  }

  /**
   * Sleep utility for exponential backoff
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Handle successful operation
   */
  private onSuccess() {
    this.successCount++

    if (this.state === 'HALF_OPEN') {
      console.log('[Circuit Breaker] Recovery successful (CLOSED)')
      this.failureCount = 0
    }

    this.state = 'CLOSED'
  }

  /**
   * Handle failed operation
   */
  private onFailure() {
    this.failureCount++
    this.lastFailureTime = Date.now()

    if (this.failureCount >= this.threshold) {
      console.error(
        `[Circuit Breaker] Threshold reached (${this.failureCount}/${this.threshold}) - Opening circuit`
      )
      this.state = 'OPEN'
    } else {
      console.warn(
        `[Circuit Breaker] Failure count: ${this.failureCount}/${this.threshold}`
      )
    }
  }

  /**
   * Get current circuit breaker status
   */
  getStatus(): CircuitBreakerStatus {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      successCount: this.successCount,
      totalRequests: this.totalRequests,
      lastError: this.lastError,
    }
  }

  /**
   * Get detailed metrics for monitoring
   */
  getMetrics() {
    const failureRate =
      this.totalRequests > 0
        ? ((this.failureCount / this.totalRequests) * 100).toFixed(2)
        : '0.00'

    return {
      ...this.getStatus(),
      failureRate: `${failureRate}%`,
      isHealthy: this.state === 'CLOSED',
      timeUntilRetry:
        this.state === 'OPEN'
          ? Math.max(0, this.timeout - (Date.now() - this.lastFailureTime))
          : 0,
    }
  }

  /**
   * Manual reset (admin use only)
   */
  reset() {
    console.log('[Circuit Breaker] Manual reset triggered')
    this.failureCount = 0
    this.successCount = 0
    this.lastFailureTime = 0
    this.lastError = undefined
    this.state = 'CLOSED'
  }
}

// Export singleton instance with default configuration
export const dbCircuitBreaker = new CircuitBreaker({
  threshold: 5,
  timeout: 30000,
  maxRetries: 3,
  initialBackoff: 1000,
  maxBackoff: 32000,
  backoffMultiplier: 2,
})

/**
 * Usage Example:
 *
 * import { dbCircuitBreaker } from '@/lib/db-circuit-breaker'
 * import { prisma } from '@/lib/prisma-optimized'
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
