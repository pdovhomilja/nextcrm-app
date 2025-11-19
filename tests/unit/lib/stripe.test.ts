/**
 * Unit Tests: Stripe Integration
 * Tests Stripe customer and subscription management
 */

import {
  getStripeCustomerByEmail,
  createStripeCustomer,
  getOrCreateStripeCustomer,
  getStripeSubscription,
} from '@/lib/stripe'

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    customers: {
      list: jest.fn(),
      create: jest.fn(),
    },
    subscriptions: {
      retrieve: jest.fn(),
    },
  }))
})

import { stripe } from '@/lib/stripe'

const mockStripe = stripe as jest.Mocked<typeof stripe>

describe('Stripe Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getStripeCustomerByEmail', () => {
    it('should retrieve customer by email', async () => {
      const mockCustomer = {
        id: 'cus_123',
        email: 'test@example.com',
        name: 'Test User',
        metadata: {
          organizationId: 'org_123',
        },
      }

      mockStripe.customers.list = jest.fn().mockResolvedValue({
        data: [mockCustomer],
      })

      const result = await getStripeCustomerByEmail('test@example.com')

      expect(result).toEqual(mockCustomer)
      expect(mockStripe.customers.list).toHaveBeenCalledWith({
        email: 'test@example.com',
        limit: 1,
      })
    })

    it('should return undefined when customer not found', async () => {
      mockStripe.customers.list = jest.fn().mockResolvedValue({
        data: [],
      })

      const result = await getStripeCustomerByEmail('notfound@example.com')

      expect(result).toBeUndefined()
    })

    it('should return first customer when multiple exist', async () => {
      const mockCustomers = [
        { id: 'cus_1', email: 'duplicate@example.com' },
        { id: 'cus_2', email: 'duplicate@example.com' },
      ]

      mockStripe.customers.list = jest.fn().mockResolvedValue({
        data: mockCustomers,
      })

      const result = await getStripeCustomerByEmail('duplicate@example.com')

      expect(result).toEqual(mockCustomers[0])
    })
  })

  describe('createStripeCustomer', () => {
    it('should create customer with all fields', async () => {
      const mockCustomer = {
        id: 'cus_new123',
        email: 'new@example.com',
        name: 'New User',
        metadata: {
          organizationId: 'org_new123',
        },
      }

      mockStripe.customers.create = jest.fn().mockResolvedValue(mockCustomer)

      const result = await createStripeCustomer({
        email: 'new@example.com',
        name: 'New User',
        organizationId: 'org_new123',
      })

      expect(result).toEqual(mockCustomer)
      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: 'new@example.com',
        name: 'New User',
        metadata: {
          organizationId: 'org_new123',
        },
      })
    })

    it('should create customer without name', async () => {
      const mockCustomer = {
        id: 'cus_noname',
        email: 'noname@example.com',
        metadata: {
          organizationId: 'org_123',
        },
      }

      mockStripe.customers.create = jest.fn().mockResolvedValue(mockCustomer)

      const result = await createStripeCustomer({
        email: 'noname@example.com',
        name: null,
        organizationId: 'org_123',
      })

      expect(result).toEqual(mockCustomer)
      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: 'noname@example.com',
        name: undefined,
        metadata: {
          organizationId: 'org_123',
        },
      })
    })

    it('should include organizationId in metadata', async () => {
      mockStripe.customers.create = jest.fn().mockResolvedValue({
        id: 'cus_123',
        metadata: {
          organizationId: 'org_important',
        },
      })

      await createStripeCustomer({
        email: 'test@example.com',
        name: 'Test',
        organizationId: 'org_important',
      })

      expect(mockStripe.customers.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {
            organizationId: 'org_important',
          },
        })
      )
    })
  })

  describe('getOrCreateStripeCustomer', () => {
    it('should return existing customer if found', async () => {
      const existingCustomer = {
        id: 'cus_existing',
        email: 'existing@example.com',
        name: 'Existing User',
      }

      mockStripe.customers.list = jest.fn().mockResolvedValue({
        data: [existingCustomer],
      })

      const result = await getOrCreateStripeCustomer({
        email: 'existing@example.com',
        name: 'Existing User',
        organizationId: 'org_123',
      })

      expect(result).toEqual(existingCustomer)
      expect(mockStripe.customers.list).toHaveBeenCalled()
      expect(mockStripe.customers.create).not.toHaveBeenCalled()
    })

    it('should create new customer if not found', async () => {
      const newCustomer = {
        id: 'cus_new',
        email: 'new@example.com',
        name: 'New User',
        metadata: {
          organizationId: 'org_123',
        },
      }

      mockStripe.customers.list = jest.fn().mockResolvedValue({
        data: [],
      })
      mockStripe.customers.create = jest.fn().mockResolvedValue(newCustomer)

      const result = await getOrCreateStripeCustomer({
        email: 'new@example.com',
        name: 'New User',
        organizationId: 'org_123',
      })

      expect(result).toEqual(newCustomer)
      expect(mockStripe.customers.list).toHaveBeenCalled()
      expect(mockStripe.customers.create).toHaveBeenCalled()
    })

    it('should handle idempotent calls', async () => {
      const customer = {
        id: 'cus_idempotent',
        email: 'idempotent@example.com',
      }

      mockStripe.customers.list = jest.fn().mockResolvedValue({
        data: [customer],
      })

      const result1 = await getOrCreateStripeCustomer({
        email: 'idempotent@example.com',
        name: 'User',
        organizationId: 'org_123',
      })

      const result2 = await getOrCreateStripeCustomer({
        email: 'idempotent@example.com',
        name: 'User',
        organizationId: 'org_123',
      })

      expect(result1).toEqual(customer)
      expect(result2).toEqual(customer)
      expect(mockStripe.customers.create).not.toHaveBeenCalled()
    })
  })

  describe('getStripeSubscription', () => {
    it('should retrieve subscription by ID', async () => {
      const mockSubscription = {
        id: 'sub_123',
        customer: 'cus_123',
        status: 'active',
        current_period_start: 1234567890,
        current_period_end: 1234567890,
      }

      mockStripe.subscriptions.retrieve = jest.fn().mockResolvedValue(mockSubscription)

      const result = await getStripeSubscription('sub_123')

      expect(result).toEqual(mockSubscription)
      expect(mockStripe.subscriptions.retrieve).toHaveBeenCalledWith('sub_123')
    })

    it('should handle subscription not found', async () => {
      mockStripe.subscriptions.retrieve = jest.fn().mockRejectedValue(
        new Error('No such subscription')
      )

      await expect(getStripeSubscription('sub_invalid')).rejects.toThrow('No such subscription')
    })

    it('should retrieve subscription with active status', async () => {
      const activeSubscription = {
        id: 'sub_active',
        status: 'active',
      }

      mockStripe.subscriptions.retrieve = jest.fn().mockResolvedValue(activeSubscription)

      const result = await getStripeSubscription('sub_active')

      expect(result.status).toBe('active')
    })

    it('should retrieve subscription with past_due status', async () => {
      const pastDueSubscription = {
        id: 'sub_past_due',
        status: 'past_due',
      }

      mockStripe.subscriptions.retrieve = jest.fn().mockResolvedValue(pastDueSubscription)

      const result = await getStripeSubscription('sub_past_due')

      expect(result.status).toBe('past_due')
    })
  })

  describe('Error Handling', () => {
    it('should handle Stripe API errors when listing customers', async () => {
      mockStripe.customers.list = jest.fn().mockRejectedValue(
        new Error('Stripe API Error')
      )

      await expect(
        getStripeCustomerByEmail('error@example.com')
      ).rejects.toThrow('Stripe API Error')
    })

    it('should handle Stripe API errors when creating customer', async () => {
      mockStripe.customers.create = jest.fn().mockRejectedValue(
        new Error('Invalid request')
      )

      await expect(
        createStripeCustomer({
          email: 'invalid@example.com',
          name: 'Invalid',
          organizationId: 'org_123',
        })
      ).rejects.toThrow('Invalid request')
    })

    it('should handle network errors', async () => {
      mockStripe.customers.list = jest.fn().mockRejectedValue(
        new Error('Network error')
      )

      await expect(
        getStripeCustomerByEmail('network@example.com')
      ).rejects.toThrow('Network error')
    })
  })

  describe('Environment Configuration', () => {
    it('should require STRIPE_SECRET_KEY', () => {
      const originalKey = process.env.STRIPE_SECRET_KEY

      delete process.env.STRIPE_SECRET_KEY

      expect(() => {
        jest.resetModules()
        require('@/lib/stripe')
      }).toThrow('Missing STRIPE_SECRET_KEY')

      process.env.STRIPE_SECRET_KEY = originalKey
    })
  })
})
