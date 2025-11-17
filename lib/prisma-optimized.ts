import { PrismaClient } from '@prisma/client'
import { dbCircuitBreaker } from './db-circuit-breaker'

// Connection pool configuration for MongoDB with 50 max connections
const globalForPrisma = global as unknown as { prisma: PrismaClient }

/**
 * Optimized Prisma client for production with connection pooling
 * - 50 max connections for production workload
 * - Circuit breaker pattern for automatic failover
 * - Exponential backoff retry logic
 * - Comprehensive logging
 */
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
    datasources: {
      db: {
        url: getOptimizedDatabaseUrl(),
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

/**
 * Builds optimized MongoDB connection URL with connection pooling parameters
 *
 * Production Configuration:
 * - maxPoolSize=50: Max concurrent connections (suitable for Vercel Pro/Enterprise)
 * - minPoolSize=5: Keep 5 connections warm to reduce cold starts
 * - maxIdleTimeMS=30000: Close idle connections after 30s to prevent stale connections
 * - serverSelectionTimeoutMS=5000: Fail fast on connection issues (5s timeout)
 * - retryWrites=true: Automatic retry on transient write failures
 * - w=majority: Write concern for data durability
 * - connectTimeoutMS=10000: 10s connection timeout
 * - socketTimeoutMS=45000: 45s socket timeout
 */
function getOptimizedDatabaseUrl(): string {
  const baseUrl = process.env.DATABASE_URL

  if (!baseUrl) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  // Check if URL already has query parameters
  const hasQueryParams = baseUrl.includes('?')
  const separator = hasQueryParams ? '&' : '?'

  // Production pool size (50 connections)
  const maxPoolSize = process.env.NODE_ENV === 'production' ? 50 : 10
  const minPoolSize = process.env.NODE_ENV === 'production' ? 5 : 2

  const poolingParams = [
    `maxPoolSize=${maxPoolSize}`,
    `minPoolSize=${minPoolSize}`,
    'maxIdleTimeMS=30000',
    'serverSelectionTimeoutMS=5000',
    'connectTimeoutMS=10000',
    'socketTimeoutMS=45000',
    'retryWrites=true',
    'w=majority',
  ].join('&')

  return `${baseUrl}${separator}${poolingParams}`
}

/**
 * Execute database operation with circuit breaker protection
 * Provides automatic failover and exponential backoff retry logic
 *
 * @example
 * const accounts = await executeWithCircuitBreaker(() =>
 *   prisma.crm_Accounts.findMany({ where: { organizationId } })
 * )
 */
export async function executeWithCircuitBreaker<T>(
  operation: () => Promise<T>
): Promise<T> {
  return dbCircuitBreaker.execute(operation)
}

/**
 * Get database connection status
 */
export async function getDatabaseStatus(): Promise<{
  connected: boolean
  responseTime: number
  circuitBreakerState: string
  error?: string
}> {
  const startTime = Date.now()

  try {
    await prisma.$queryRaw\`SELECT 1\`

    return {
      connected: true,
      responseTime: Date.now() - startTime,
      circuitBreakerState: dbCircuitBreaker.getStatus().state,
    }
  } catch (error) {
    return {
      connected: false,
      responseTime: Date.now() - startTime,
      circuitBreakerState: dbCircuitBreaker.getStatus().state,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Gracefully close database connections
 * Call this during application shutdown
 */
export async function closeDatabaseConnection(): Promise<void> {
  try {
    await prisma.$disconnect()
    console.log('[Prisma] Database connection closed gracefully')
  } catch (error) {
    console.error('[Prisma] Error closing database connection:', error)
  }
}

// Recommended MongoDB Atlas Connection String Template:
// mongodb+srv://user:pass@cluster.mongodb.net/nextcrm?retryWrites=true&w=majority&maxPoolSize=50&minPoolSize=5&maxIdleTimeMS=30000&serverSelectionTimeoutMS=5000&connectTimeoutMS=10000&socketTimeoutMS=45000
