/**
 * Unit Tests: Authentication
 * Tests NextAuth configuration and authentication flows
 */

import { authOptions } from '@/lib/auth'
import bcrypt from 'bcrypt'
import type { CredentialsConfig } from 'next-auth/providers/credentials'

// Mock dependencies
jest.mock('@/lib/prisma')
jest.mock('@/lib/new-user-notify')

import { prismadb } from '@/lib/prisma'
import { newUserNotify } from '@/lib/new-user-notify'

const mockPrisma = prismadb as jest.Mocked<typeof prismadb>
const mockNewUserNotify = newUserNotify as jest.MockedFunction<typeof newUserNotify>

describe('Authentication Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('authOptions', () => {
    it('should have JWT session strategy', () => {
      expect(authOptions.session?.strategy).toBe('jwt')
    })

    it('should have JWT_SECRET configured', () => {
      expect(authOptions.secret).toBeDefined()
      expect(authOptions.secret).toBe(process.env.JWT_SECRET)
    })

    it('should have three providers configured', () => {
      expect(authOptions.providers).toHaveLength(3)
      expect(authOptions.providers.map(p => p.id)).toContain('google')
      expect(authOptions.providers.map(p => p.id)).toContain('github')
      expect(authOptions.providers.map(p => p.id)).toContain('credentials')
    })
  })

  describe('Credentials Provider', () => {
    const credentialsProvider = authOptions.providers.find(p => p.id === 'credentials') as CredentialsConfig

    it('should be configured', () => {
      expect(credentialsProvider).toBeDefined()
      // FIXED: Provider name can be either "Credentials" or "credentials" depending on NextAuth version
      expect(credentialsProvider?.name).toMatch(/[Cc]redentials/)
    })

    describe('authorize function', () => {
      // FIXED: Extract authorize function directly from the credentials provider
      const authorize = credentialsProvider?.authorize

      it('should have authorize function', () => {
        expect(authorize).toBeDefined()
        expect(typeof authorize).toBe('function')
      })

      it('should throw error when email is missing', async () => {
        if (!authorize) {
          throw new Error('authorize function not found')
        }

        await expect(
          authorize({ password: 'test123' }, {} as any)
        ).rejects.toThrow('Email or password is missing')
      })

      it('should throw error when password is missing', async () => {
        if (!authorize) {
          throw new Error('authorize function not found')
        }

        await expect(
          authorize({ email: 'test@example.com' }, {} as any)
        ).rejects.toThrow('Email or password is missing')
      })

      it('should throw error when user not found', async () => {
        if (!authorize) {
          throw new Error('authorize function not found')
        }

        mockPrisma.users.findFirst = jest.fn().mockResolvedValue(null)

        await expect(
          authorize({ email: 'notfound@example.com', password: 'test123' }, {} as any)
        ).rejects.toThrow('User not found')
      })

      it('should throw error when password is null', async () => {
        if (!authorize) {
          throw new Error('authorize function not found')
        }

        mockPrisma.users.findFirst = jest.fn().mockResolvedValue({
          id: '1',
          email: 'test@example.com',
          password: null,
        })

        await expect(
          authorize({ email: 'test@example.com', password: 'test123' }, {} as any)
        ).rejects.toThrow('User not found')
      })

      it('should throw error when password is incorrect', async () => {
        if (!authorize) {
          throw new Error('authorize function not found')
        }

        const hashedPassword = await bcrypt.hash('correctpassword', 10)

        mockPrisma.users.findFirst = jest.fn().mockResolvedValue({
          id: '1',
          email: 'test@example.com',
          password: hashedPassword,
        })

        await expect(
          authorize({ email: 'test@example.com', password: 'wrongpassword' }, {} as any)
        ).rejects.toThrow('Password is incorrect')
      })

      it('should return user when credentials are correct', async () => {
        if (!authorize) {
          throw new Error('authorize function not found')
        }

        const password = 'correctpassword'
        const hashedPassword = await bcrypt.hash(password, 10)

        const mockUser = {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          password: hashedPassword,
        }

        mockPrisma.users.findFirst = jest.fn().mockResolvedValue(mockUser)

        const result = await authorize({
          email: 'test@example.com',
          password: password,
        }, {} as any)

        expect(result).toEqual(mockUser)
        expect(mockPrisma.users.findFirst).toHaveBeenCalledWith({
          where: { email: 'test@example.com' },
        })
      })

      it('should trim password before comparing', async () => {
        if (!authorize) {
          throw new Error('authorize function not found')
        }

        const password = 'correctpassword'
        const hashedPassword = await bcrypt.hash(password, 10)

        mockPrisma.users.findFirst = jest.fn().mockResolvedValue({
          id: '1',
          email: 'test@example.com',
          password: hashedPassword,
        })

        const result = await authorize({
          email: 'test@example.com',
          password: '  correctpassword  ', // with spaces
        }, {} as any)

        expect(result).toBeDefined()
      })
    })
  })

  describe('Session Callback', () => {
    const sessionCallback = authOptions.callbacks?.session

    it('should be defined', () => {
      expect(sessionCallback).toBeDefined()
    })

    describe('for existing user', () => {
      it('should populate session with user data', async () => {
        const mockUser = {
          id: 'user-123',
          email: 'existing@example.com',
          name: 'Existing User',
          avatar: 'https://example.com/avatar.jpg',
          is_admin: true,
          is_account_admin: false,
          userLanguage: 'en',
          userStatus: 'ACTIVE',
          lastLoginAt: new Date(),
          organizationId: 'org-123',
          organization_role: 'ADMIN',
        }

        mockPrisma.users.findFirst = jest.fn().mockResolvedValue(mockUser)
        mockPrisma.users.update = jest.fn().mockResolvedValue(mockUser)

        const token = { email: 'existing@example.com', name: 'Existing User' }
        const session = { user: {} }

        const result = await sessionCallback!({ token, session } as any)

        expect(result.user.id).toBe('user-123')
        expect(result.user.email).toBe('existing@example.com')
        expect(result.user.isAdmin).toBe(true)
        expect(result.user.organizationId).toBe('org-123')

        expect(mockPrisma.users.update).toHaveBeenCalledWith({
          where: { id: 'user-123' },
          data: { lastLoginAt: expect.any(Date) },
        })
      })
    })

    describe('for new user (OAuth)', () => {
      it('should create new user and notify', async () => {
        const newUser = {
          id: 'new-user-123',
          email: 'newuser@example.com',
          name: 'New User',
          avatar: 'https://example.com/avatar.jpg',
          is_admin: false,
          is_account_admin: false,
          userLanguage: 'en',
          userStatus: 'PENDING',
          lastLoginAt: new Date(),
          organizationId: null,
          organization_role: null,
        }

        mockPrisma.users.findFirst = jest.fn().mockResolvedValue(null)
        mockPrisma.users.create = jest.fn().mockResolvedValue(newUser)
        mockNewUserNotify.mockResolvedValue(undefined)

        const token = {
          email: 'newuser@example.com',
          name: 'New User',
          picture: 'https://example.com/avatar.jpg',
        }
        const session = { user: {} }

        const result = await sessionCallback!({ token, session } as any)

        expect(mockPrisma.users.create).toHaveBeenCalled()
        expect(mockNewUserNotify).toHaveBeenCalledWith(newUser)
        expect(result.user.id).toBe('new-user-123')
        expect(result.user.userStatus).toBe('PENDING')
      })

      it('should set status to ACTIVE for demo environment', async () => {
        const originalUrl = process.env.NEXT_PUBLIC_APP_URL
        process.env.NEXT_PUBLIC_APP_URL = 'https://demo.nextcrm.io'

        const newUser = {
          id: 'demo-user-123',
          email: 'demo@example.com',
          name: 'Demo User',
          avatar: null,
          is_admin: false,
          is_account_admin: false,
          userLanguage: 'en',
          userStatus: 'ACTIVE',
          lastLoginAt: new Date(),
          organizationId: null,
          organization_role: null,
        }

        mockPrisma.users.findFirst = jest.fn().mockResolvedValue(null)
        mockPrisma.users.create = jest.fn().mockResolvedValue(newUser)

        const token = { email: 'demo@example.com', name: 'Demo User' }
        const session = { user: {} }

        await sessionCallback!({ token, session } as any)

        expect(mockPrisma.users.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            userStatus: 'ACTIVE',
          }),
        })

        process.env.NEXT_PUBLIC_APP_URL = originalUrl
      })

      it('should handle creation errors gracefully', async () => {
        mockPrisma.users.findFirst = jest.fn().mockResolvedValue(null)
        mockPrisma.users.create = jest.fn().mockRejectedValue(new Error('Database error'))

        const token = { email: 'error@example.com', name: 'Error User' }
        const session = { user: {} }

        const result = await sessionCallback!({ token, session } as any)

        // Should return original session without throwing
        expect(result).toBe(session)
      })
    })
  })

  describe('Environment Variables', () => {
    it('should require GOOGLE_ID', () => {
      const originalId = process.env.GOOGLE_ID

      delete process.env.GOOGLE_ID

      expect(() => {
        // Re-import to trigger validation
        jest.resetModules()
        require('@/lib/auth')
      }).toThrow('Missing GOOGLE_ID')

      process.env.GOOGLE_ID = originalId
    })

    it('should require GOOGLE_SECRET', () => {
      const originalSecret = process.env.GOOGLE_SECRET
      const originalId = process.env.GOOGLE_ID

      process.env.GOOGLE_ID = 'test-id'
      delete process.env.GOOGLE_SECRET

      expect(() => {
        jest.resetModules()
        require('@/lib/auth')
      }).toThrow('Missing GOOGLE_SECRET')

      process.env.GOOGLE_SECRET = originalSecret
      process.env.GOOGLE_ID = originalId
    })
  })
})
