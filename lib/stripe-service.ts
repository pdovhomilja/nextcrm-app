import { Stripe } from 'stripe'
import { prismadb } from '@/lib/prisma'
import { EmailService } from '@/lib/email-service'

export class StripeService {
  private static stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-10-28'
  })

  /**
   * Create Stripe customer
   */
  static async createCustomer(data: {
    tenantId: string
    email: string
    name: string
  }) {
    const customer = await this.stripe.customers.create({
      email: data.email,
      name: data.name,
      metadata: {
        tenantId: data.tenantId
      }
    })

    // Save to database
    await prismadb.tenant.update({
      where: { id: data.tenantId },
      data: { stripeCustomerId: customer.id }
    })

    return customer
  }

  /**
   * Create subscription
   */
  static async createSubscription(data: {
    tenantId: string
    stripePriceId: string
    trialDays?: number
  }) {
    const tenant = await prismadb.tenant.findUnique({
      where: { id: data.tenantId }
    })

    if (!tenant || !tenant.stripeCustomerId) {
      throw new Error('Tenant not found or not linked to Stripe')
    }

    const subscription = await this.stripe.subscriptions.create({
      customer: tenant.stripeCustomerId,
      items: [{ price: data.stripePriceId }],
      ...(data.trialDays && {
        trial_period_days: data.trialDays
      })
    })

    // Save to database
    const dbSubscription = await prismadb.subscriptions.create({
      data: {
        tenantId: data.tenantId,
        stripeCustomerId: tenant.stripeCustomerId,
        stripeSubscriptionId: subscription.id,
        stripePriceId: data.stripePriceId,
        status: 'TRIALING',
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : undefined,
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined
      }
    })

    return { stripeSubscription: subscription, dbSubscription }
  }

  /**
   * Update subscription
   */
  static async updateSubscription(subscriptionId: string, stripePriceId: string) {
    const stripeSubscription = await this.stripe.subscriptions.retrieve(subscriptionId)

    const updated = await this.stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: stripeSubscription.items.data[0].id,
          price: stripePriceId
        }
      ]
    })

    // Update database
    const subscription = await prismadb.subscriptions.findFirst({
      where: { stripeSubscriptionId: subscriptionId }
    })

    if (subscription) {
      await prismadb.subscriptions.update({
        where: { id: subscription.id },
        data: {
          stripePriceId: stripePriceId
        }
      })
    }

    return updated
  }

  /**
   * Cancel subscription
   */
  static async cancelSubscription(subscriptionId: string, immediately: boolean = false) {
    const subscription = await this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: !immediately
    })

    // Update database
    const dbSubscription = await prismadb.subscriptions.findFirst({
      where: { stripeSubscriptionId: subscriptionId }
    })

    if (dbSubscription) {
      await prismadb.subscriptions.update({
        where: { id: dbSubscription.id },
        data: {
          cancelAtPeriodEnd: !immediately,
          canceledAt: immediately ? new Date() : undefined
        }
      })
    }

    return subscription
  }

  /**
   * Get subscription status
   */
  static async getSubscriptionStatus(subscriptionId: string) {
    return this.stripe.subscriptions.retrieve(subscriptionId)
  }

  /**
   * Handle subscription webhook
   */
  static async handleSubscriptionEvent(event: Stripe.Event) {
    const subscription = event.data.object as Stripe.Subscription

    const dbSubscription = await prismadb.subscriptions.findFirst({
      where: { stripeSubscriptionId: subscription.id },
      include: { organization: { include: { owner: true } } }
    })

    if (!dbSubscription) {
      return
    }

    switch (event.type) {
      case 'customer.subscription.updated':
        await prismadb.subscriptions.update({
          where: { id: dbSubscription.id },
          data: {
            status: subscription.status as any,
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000)
          }
        })
        break

      case 'customer.subscription.deleted':
        await prismadb.subscriptions.update({
          where: { id: dbSubscription.id },
          data: {
            status: 'CANCELED',
            canceledAt: new Date()
          }
        })
        break

      case 'invoice.payment_succeeded':
        const invoice = event.data.object as Stripe.Invoice
        await prismadb.paymentHistory.create({
          data: {
            organizationId: dbSubscription.organizationId,
            stripePaymentIntentId: invoice.payment_intent?.toString() || 'unknown',
            stripeInvoiceId: invoice.id,
            amount: invoice.total!,
            currency: invoice.currency,
            status: 'SUCCEEDED',
            receiptUrl: invoice.receipt_url || undefined
          }
        })
        break

      case 'invoice.payment_failed':
        const failedInvoice = event.data.object as Stripe.Invoice
        await prismadb.paymentHistory.create({
          data: {
            organizationId: dbSubscription.organizationId,
            stripePaymentIntentId: failedInvoice.payment_intent?.toString() || 'unknown',
            stripeInvoiceId: failedInvoice.id,
            amount: failedInvoice.total!,
            currency: failedInvoice.currency,
            status: 'FAILED'
          }
        })

        // Send notification email
        if (dbSubscription.organization?.owner) {
          await EmailService.sendPaymentFailedNotification(
            dbSubscription.organization.owner.email,
            {
              firstName: dbSubscription.organization.owner.name || 'User',
              tenantName: dbSubscription.organization.name,
              billingUrl: `${process.env.NEXT_PUBLIC_APP_URL}/billing`
            }
          )
        }
        break
    }
  }

  /**
   * Create payment intent for custom amount
   */
  static async createPaymentIntent(data: {
    tenantId: string
    amount: number
    currency?: string
    description?: string
  }) {
    const tenant = await prismadb.tenant.findUnique({
      where: { id: data.tenantId }
    })

    if (!tenant || !tenant.stripeCustomerId) {
      throw new Error('Tenant not found or not linked to Stripe')
    }

    const paymentIntent = await this.stripe.paymentIntents.create({
      customer: tenant.stripeCustomerId,
      amount: data.amount,
      currency: data.currency || 'aud',
      description: data.description
    })

    return paymentIntent
  }

  /**
   * Get customer portal session
   */
  static async createPortalSession(stripeCustomerId: string) {
    return this.stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`
    })
  }

  /**
   * List invoices for customer
   */
  static async getInvoices(stripeCustomerId: string) {
    return this.stripe.invoices.list({
      customer: stripeCustomerId,
      limit: 100
    })
  }
}
