import { PrismaClient } from '@prisma/client'

// Connection pool configuration for MongoDB
const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Recommended MongoDB Atlas Connection String:
// mongodb+srv://user:pass@cluster.mongodb.net/nextcrm?retryWrites=true&w=majority&maxPoolSize=10&minPoolSize=2&maxIdleTimeMS=30000&serverSelectionTimeoutMS=5000

/**
 * Connection Pool Parameters:
 * - maxPoolSize=10: Max concurrent connections (Hobby: 10, Pro: 50)
 * - minPoolSize=2: Keep 2 connections warm (reduces cold starts)
 * - maxIdleTimeMS=30000: Close idle connections after 30s
 * - serverSelectionTimeoutMS=5000: Fail fast on connection issues
 * - retryWrites=true: Automatic retry on transient failures
 */
