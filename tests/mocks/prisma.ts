/**
 * Prisma Client Mock for Testing
 * Provides a mock implementation of the Prisma client for unit tests
 */

import { PrismaClient } from '@prisma/client'
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended'

// Create a deep mock of the Prisma client
export const prismaMock = mockDeep<PrismaClient>() as unknown as DeepMockProxy<PrismaClient>

// Mock the Prisma client module
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prismadb: prismaMock,
}))

// Reset mocks before each test
beforeEach(() => {
  mockReset(prismaMock)
})

export default prismaMock
