/**
 * Integration Tests: Stripe Webhooks
 * Tests Stripe webhook event handling for subscriptions and payments
 */

import { POST } from '@/app/api/webhooks/stripe/route'
import '../../../tests/mocks/prisma'
import { prismaMock } from '../../../tests/mocks/prisma'
import Stripe from 'stripe'

// Mock Stripe
jest.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: {
      constructEvent: jest.fn(),
    },
  },
}))

import { stripe } from '@/lib/stripe'

const mockStripe = stripe as jest.Mocked<typeof stripe>

describe('Stripe Webhook Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret'
  })

  afterEach(() => {
    delete process.env.STRIPE_WEBHOOK_SECRET
  })

  describe('Webhook Signature Verification', () => {
    it('should reject request without signature', async () => {
      const mockRequest = new Request('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify({ type: 'test' }),
        headers: new Headers(),
      })

      const response = await POST(mockRequest)

      expect(response.status).toBe(400)
      const text = await response.text()
      expect(text).toContain('Missing stripe-signature header')
    })

    it('should reject request with invalid signature', async () => {
      mockStripe.webhooks.constructEvent = jest.fn().mockImplementation(() => {
        throw new Error('Invalid signature')
      })

      const mockRequest = new Request('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify({ type: 'test' }),
        headers: new Headers({
          'stripe-signature': 'invalid_signature',
        }),
      })

      const response = await POST(mockRequest)

      expect(response.status).toBe(400)
      const text = await response.text()
      expect(text).toContain('Invalid signature')
    })

    it('should reject request when webhook secret not configured', async () => {
      delete process.env.STRIPE_WEBHOOK_SECRET

      const mockRequest = new Request('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify({ type: 'test' }),
        headers: new Headers({
          'stripe-signature': 'some_signature',
        }),
      })

      const response = await POST(mockRequest)

      expect(response.status).toBe(500)
      const text = await response.text()
      expect(text).toContain('Webhook secret not configured')
    })

    it('should accept request with valid signature', async () => {
      const mockEvent: Stripe.Event = {
        id: 'evt_test123',
        object: 'event',
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_test123',
            customer: 'cus_test123',
            status: 'active',
            items: {
              data: [
                {
                  price: {
                    id: 'price_pro',
                  },
                } as Stripe.SubscriptionItem,
              ],
              object: 'list',
              has_more: false,
              url: '/v1/subscription_items',
            },
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
            cancel_at_period_end: false,
          } as Stripe.Subscription,
        },
        api_version: null,
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        pending_webhooks: 0,
        request: null,
      }

      mockStripe.webhooks.constructEvent = jest.fn().mockReturnValue(mockEvent)

      prismaMock.organizations.findFirst = jest.fn().mockResolvedValue({
        id: 'org_test123',
        stripeCustomerId: 'cus_test123',
      })

      prismaMock.subscriptions.upsert = jest.fn().mockResolvedValue({})
      prismaMock.organizations.update = jest.fn().mockResolvedValue({})
      prismaMock.$transaction = jest.fn().mockImplementation((args) => Promise.all(args))

      const mockRequest = new Request('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: new Headers({
          'stripe-signature': 'valid_signature',
        }),
      })

      const response = await POST(mockRequest)

      expect(response.status).toBe(200)
      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalled()
    })
  })

  describe('customer.subscription.created Event', () => {
    it('should create subscription and update organization plan', async () => {
      const mockSubscription = {
        id: 'sub_new123',
        customer: 'cus_org123',
        status: 'active',
        items: {
          data: [
            {
              price: {
                id: 'price_pro_monthly',
              },
            } as Stripe.SubscriptionItem,
          ],
          object: 'list',
          has_more: false,
          url: '/v1/subscription_items',
        },
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        cancel_at_period_end: false,
        canceled_at: null,
        trial_start: null,
        trial_end: null,
      } as Stripe.Subscription

      const mockEvent: Stripe.Event = {
        id: 'evt_sub_created',
        object: 'event',
        type: 'customer.subscription.created',
        data: { object: mockSubscription },
        api_version: null,
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        pending_webhooks: 0,
        request: null,
      }

      mockStripe.webhooks.constructEvent = jest.fn().mockReturnValue(mockEvent)

      prismaMock.organizations.findFirst = jest.fn().mockResolvedValue({
        id: 'org_123',
        stripeCustomerId: 'cus_org123',
        plan: 'FREE',
      })

      prismaMock.subscriptions.upsert = jest.fn().mockResolvedValue({})
      prismaMock.organizations.update = jest.fn().mockResolvedValue({})
      prismaMock.$transaction = jest.fn().mockImplementation((args) => Promise.all(args))

      const mockRequest = new Request('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: new Headers({ 'stripe-signature': 'valid_sig' }),
      })

      const response = await POST(mockRequest)

      expect(response.status).toBe(200)
      expect(prismaMock.$transaction).toHaveBeenCalled()
    })

    it('should handle missing organization gracefully', async () => {
      const mockSubscription = {
        id: 'sub_orphan',
        customer: 'cus_notfound',
        status: 'active',
        items: {
          data: [{ price: { id: 'price_pro' } } as Stripe.SubscriptionItem],
          object: 'list',
          has_more: false,
          url: '/v1/subscription_items',
        },
      } as Stripe.Subscription

      const mockEvent: Stripe.Event = {
        id: 'evt_orphan',
        object: 'event',
        type: 'customer.subscription.created',
        data: { object: mockSubscription },
        api_version: null,
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        pending_webhooks: 0,
        request: null,
      }

      mockStripe.webhooks.constructEvent = jest.fn().mockReturnValue(mockEvent)
      prismaMock.organizations.findFirst = jest.fn().mockResolvedValue(null)

      const mockRequest = new Request('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: new Headers({ 'stripe-signature': 'valid_sig' }),
      })

      const response = await POST(mockRequest)

      // Should still return 200 but not update anything
      expect(response.status).toBe(200)
      expect(prismaMock.$transaction).not.toHaveBeenCalled()
    })
  })

  describe('customer.subscription.updated Event', () => {
    it('should update existing subscription', async () => {
      const mockSubscription = {
        id: 'sub_existing',
        customer: 'cus_org456',
        status: 'active',
        items: {
          data: [{ price: { id: 'price_enterprise' } } as Stripe.SubscriptionItem],
          object: 'list',
          has_more: false,
          url: '/v1/subscription_items',
        },
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        cancel_at_period_end: false,
      } as Stripe.Subscription

      const mockEvent: Stripe.Event = {
        id: 'evt_sub_updated',
        object: 'event',
        type: 'customer.subscription.updated',
        data: { object: mockSubscription },
        api_version: null,
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        pending_webhooks: 0,
        request: null,
      }

      mockStripe.webhooks.constructEvent = jest.fn().mockReturnValue(mockEvent)

      prismaMock.organizations.findFirst = jest.fn().mockResolvedValue({
        id: 'org_456',
        stripeCustomerId: 'cus_org456',
        plan: 'PRO',
      })

      prismaMock.subscriptions.upsert = jest.fn().mockResolvedValue({})
      prismaMock.organizations.update = jest.fn().mockResolvedValue({})
      prismaMock.$transaction = jest.fn().mockImplementation((args) => Promise.all(args))

      const mockRequest = new Request('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: new Headers({ 'stripe-signature': 'valid_sig' }),
      })

      const response = await POST(mockRequest)

      expect(response.status).toBe(200)
      expect(prismaMock.$transaction).toHaveBeenCalled()
    })
  })

  describe('customer.subscription.deleted Event', () => {
    it('should cancel subscription and downgrade to FREE', async () => {
      const mockSubscription = {
        id: 'sub_canceled',
        customer: 'cus_org789',
        status: 'canceled',
      } as Stripe.Subscription

      const mockEvent: Stripe.Event = {
        id: 'evt_sub_deleted',
        object: 'event',
        type: 'customer.subscription.deleted',
        data: { object: mockSubscription },
        api_version: null,
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        pending_webhooks: 0,
        request: null,
      }

      mockStripe.webhooks.constructEvent = jest.fn().mockReturnValue(mockEvent)

      prismaMock.organizations.findFirst = jest.fn().mockResolvedValue({
        id: 'org_789',
        stripeCustomerId: 'cus_org789',
        plan: 'PRO',
      })

      prismaMock.subscriptions.update = jest.fn().mockResolvedValue({})
      prismaMock.organizations.update = jest.fn().mockResolvedValue({ plan: 'FREE' })
      prismaMock.$transaction = jest.fn().mockImplementation((args) => Promise.all(args))

      const mockRequest = new Request('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: new Headers({ 'stripe-signature': 'valid_sig' }),
      })

      const response = await POST(mockRequest)

      expect(response.status).toBe(200)
      expect(prismaMock.$transaction).toHaveBeenCalled()
    })
  })

  describe('invoice.payment_succeeded Event', () => {
    it('should record successful payment', async () => {
      const mockInvoice = {
        id: 'in_success123',
        customer: 'cus_org123',
        payment_intent: 'pi_success123',
        amount_paid: 2900,
        currency: 'usd',
        description: 'Pro Plan',
        hosted_invoice_url: 'https://invoice.stripe.com/i/success123',
      } as Stripe.Invoice

      const mockEvent: Stripe.Event = {
        id: 'evt_invoice_success',
        object: 'event',
        type: 'invoice.payment_succeeded',
        data: { object: mockInvoice },
        api_version: null,
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        pending_webhooks: 0,
        request: null,
      }

      mockStripe.webhooks.constructEvent = jest.fn().mockReturnValue(mockEvent)

      prismaMock.organizations.findFirst = jest.fn().mockResolvedValue({
        id: 'org_123',
        name: 'Test Org',
        stripeCustomerId: 'cus_org123',
      })

      prismaMock.paymentHistory.upsert = jest.fn().mockResolvedValue({})

      const mockRequest = new Request('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: new Headers({ 'stripe-signature': 'valid_sig' }),
      })

      const response = await POST(mockRequest)

      expect(response.status).toBe(200)
      expect(prismaMock.paymentHistory.upsert).toHaveBeenCalled()
    })

    it('should skip invoice without payment intent', async () => {
      const mockInvoice = {
        id: 'in_no_intent',
        customer: 'cus_org123',
        payment_intent: null,
      } as Stripe.Invoice

      const mockEvent: Stripe.Event = {
        id: 'evt_no_intent',
        object: 'event',
        type: 'invoice.payment_succeeded',
        data: { object: mockInvoice },
        api_version: null,
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        pending_webhooks: 0,
        request: null,
      }

      mockStripe.webhooks.constructEvent = jest.fn().mockReturnValue(mockEvent)

      const mockRequest = new Request('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: new Headers({ 'stripe-signature': 'valid_sig' }),
      })

      const response = await POST(mockRequest)

      expect(response.status).toBe(200)
      expect(prismaMock.paymentHistory.upsert).not.toHaveBeenCalled()
    })
  })

  describe('invoice.payment_failed Event', () => {
    it('should record failed payment', async () => {
      const mockInvoice = {
        id: 'in_failed123',
        customer: 'cus_org456',
        payment_intent: 'pi_failed123',
        amount_due: 2900,
        currency: 'usd',
        attempt_count: 1,
      } as Stripe.Invoice

      const mockEvent: Stripe.Event = {
        id: 'evt_invoice_failed',
        object: 'event',
        type: 'invoice.payment_failed',
        data: { object: mockInvoice },
        api_version: null,
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        pending_webhooks: 0,
        request: null,
      }

      mockStripe.webhooks.constructEvent = jest.fn().mockReturnValue(mockEvent)

      prismaMock.organizations.findFirst = jest.fn().mockResolvedValue({
        id: 'org_456',
        name: 'Test Org 2',
        stripeCustomerId: 'cus_org456',
      })

      prismaMock.paymentHistory.upsert = jest.fn().mockResolvedValue({})

      const mockRequest = new Request('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: new Headers({ 'stripe-signature': 'valid_sig' }),
      })

      const response = await POST(mockRequest)

      expect(response.status).toBe(200)
      expect(prismaMock.paymentHistory.upsert).toHaveBeenCalled()
    })
  })

  describe('Unhandled Event Types', () => {
    it('should accept but not process unknown events', async () => {
      const mockEvent: Stripe.Event = {
        id: 'evt_unknown',
        object: 'event',
        type: 'customer.created' as any,
        data: { object: {} as any },
        api_version: null,
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        pending_webhooks: 0,
        request: null,
      }

      mockStripe.webhooks.constructEvent = jest.fn().mockReturnValue(mockEvent)

      const mockRequest = new Request('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: new Headers({ 'stripe-signature': 'valid_sig' }),
      })

      const response = await POST(mockRequest)

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.received).toBe(true)
    })
  })
})
