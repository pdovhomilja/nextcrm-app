/**
 * Stripe Mock for Testing
 * Provides mock implementations of Stripe functions
 */

import Stripe from 'stripe'

export const mockStripeCustomer = {
  id: 'cus_test123',
  object: 'customer',
  email: 'test@example.com',
  name: 'Test User',
  created: Date.now(),
  livemode: false,
  metadata: {
    organizationId: 'org_test123',
  },
} as unknown as Stripe.Customer

export const mockStripeSubscription = {
  id: 'sub_test123',
  object: 'subscription',
  customer: 'cus_test123',
  status: 'active',
  current_period_start: Math.floor(Date.now() / 1000),
  current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
  items: {
    object: 'list',
    data: [{
      id: 'si_test123',
      object: 'subscription_item',
      price: {
        id: 'price_test123',
        object: 'price',
        active: true,
        currency: 'usd',
        product: 'prod_test123',
        type: 'recurring',
        unit_amount: 2900,
        recurring: {
          interval: 'month',
          interval_count: 1,
        },
      },
    } as Stripe.SubscriptionItem],
    has_more: false,
    url: '/v1/subscription_items',
  },
  metadata: {},
  created: Math.floor(Date.now() / 1000),
  currency: 'usd',
} as unknown as Stripe.Subscription

// Mock Stripe client
export const mockStripe = {
  customers: {
    list: jest.fn().mockResolvedValue({
      data: [mockStripeCustomer],
    }),
    create: jest.fn().mockResolvedValue(mockStripeCustomer),
    retrieve: jest.fn().mockResolvedValue(mockStripeCustomer),
  },
  subscriptions: {
    retrieve: jest.fn().mockResolvedValue(mockStripeSubscription),
    create: jest.fn().mockResolvedValue(mockStripeSubscription),
    update: jest.fn().mockResolvedValue(mockStripeSubscription),
  },
  webhooks: {
    constructEvent: jest.fn().mockReturnValue({
      type: 'customer.subscription.created',
      data: {
        object: mockStripeSubscription,
      },
    }),
  },
}

jest.mock('@/lib/stripe', () => ({
  stripe: mockStripe,
  getStripeCustomerByEmail: jest.fn(),
  createStripeCustomer: jest.fn(),
  getOrCreateStripeCustomer: jest.fn(),
  getStripeSubscription: jest.fn(),
}))
