import crypto from 'crypto'
import { prismadb } from '@/lib/prisma'
import axios from 'axios'

export interface WebhookEvent {
  id: string
  type: string
  resource: string
  resourceId: string
  data: Record<string, any>
  timestamp: Date
}

export interface WebhookSubscription {
  id: string
  tenantId: string
  url: string
  events: string[]
  secret: string
  isActive: boolean
}

export class WebhookService {
  /**
   * Create webhook subscription
   */
  static async createSubscription(data: {
    tenantId: string
    url: string
    events: string[]
  }): Promise<WebhookSubscription> {
    const secret = crypto.randomBytes(32).toString('hex')

    const subscription = await prismadb.webhookSubscription.create({
      data: {
        tenantId: data.tenantId,
        url: data.url,
        events: data.events,
        secret: secret,
        isActive: true
      }
    })

    return {
      id: subscription.id,
      tenantId: subscription.tenantId,
      url: subscription.url,
      events: subscription.events,
      secret, // Only returned once
      isActive: subscription.isActive
    }
  }

  /**
   * List webhook subscriptions
   */
  static async listSubscriptions(tenantId: string) {
    return prismadb.webhookSubscription.findMany({
      where: { tenantId },
      select: {
        id: true,
        url: true,
        events: true,
        isActive: true,
        failureCount: true,
        lastTriggeredAt: true,
        createdAt: true
      }
    })
  }

  /**
   * Update webhook subscription
   */
  static async updateSubscription(
    subscriptionId: string,
    data: {
      url?: string
      events?: string[]
      isActive?: boolean
    }
  ) {
    return prismadb.webhookSubscription.update({
      where: { id: subscriptionId },
      data
    })
  }

  /**
   * Delete webhook subscription
   */
  static async deleteSubscription(subscriptionId: string) {
    return prismadb.webhookSubscription.delete({
      where: { id: subscriptionId }
    })
  }

  /**
   * Trigger webhook event
   */
  static async triggerEvent(event: Omit<WebhookEvent, 'id' | 'timestamp'>) {
    // Get subscriptions for this event
    const subscriptions = await prismadb.webhookSubscription.findMany({
      where: {
        tenantId: event.data.tenantId || event.resourceId,
        events: {
          hasSome: [event.type, '*']
        },
        isActive: true
      }
    })

    // Log event
    const eventLog = await prismadb.webhookEvent.create({
      data: {
        type: event.type,
        resource: event.resource,
        resourceId: event.resourceId,
        data: event.data,
        timestamp: new Date()
      }
    })

    // Send to all subscribed endpoints
    for (const subscription of subscriptions) {
      await this.sendWebhook(subscription.id, subscription.url, subscription.secret, {
        id: eventLog.id,
        ...event,
        timestamp: new Date()
      })
    }
  }

  /**
   * Send webhook to endpoint
   */
  private static async sendWebhook(
    subscriptionId: string,
    url: string,
    secret: string,
    event: WebhookEvent
  ) {
    try {
      const payload = JSON.stringify(event)
      const signature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex')

      const response = await axios.post(url, event, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-ID': event.id,
          'X-Webhook-Timestamp': event.timestamp.toISOString()
        },
        timeout: 10000
      })

      // Mark as delivered
      await prismadb.webhookDelivery.create({
        data: {
          subscriptionId,
          eventId: event.id,
          statusCode: response.status,
          deliveredAt: new Date(),
          success: true
        }
      })

      // Reset failure count
      await prismadb.webhookSubscription.update({
        where: { id: subscriptionId },
        data: {
          failureCount: 0,
          lastTriggeredAt: new Date()
        }
      })
    } catch (error) {
      // Log delivery failure
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      await prismadb.webhookDelivery.create({
        data: {
          subscriptionId,
          eventId: event.id,
          statusCode: 0,
          errorMessage,
          success: false
        }
      })

      // Increment failure count
      const subscription = await prismadb.webhookSubscription.findUnique({
        where: { id: subscriptionId }
      })

      const newFailureCount = (subscription?.failureCount || 0) + 1

      // Disable after 10 failures
      if (newFailureCount >= 10) {
        await prismadb.webhookSubscription.update({
          where: { id: subscriptionId },
          data: {
            isActive: false,
            failureCount: newFailureCount
          }
        })
      } else {
        await prismadb.webhookSubscription.update({
          where: { id: subscriptionId },
          data: { failureCount: newFailureCount }
        })
      }
    }
  }

  /**
   * Verify webhook signature
   */
  static verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')

    return signature === expectedSignature
  }

  /**
   * Retry failed deliveries
   */
  static async retryFailedDeliveries(hoursAgo: number = 1): Promise<number> {
    const cutoffTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000)

    const failedDeliveries = await prismadb.webhookDelivery.findMany({
      where: {
        success: false,
        createdAt: {
          gte: cutoffTime
        }
      },
      include: {
        subscription: true,
        event: true
      }
    })

    let retryCount = 0

    for (const delivery of failedDeliveries) {
      if (delivery.subscription && delivery.event) {
        await this.sendWebhook(
          delivery.subscription.id,
          delivery.subscription.url,
          delivery.subscription.secret,
          delivery.event as any
        )
        retryCount++
      }
    }

    return retryCount
  }

  /**
   * Get webhook deliveries
   */
  static async getDeliveries(
    subscriptionId: string,
    options: {
      limit?: number
      offset?: number
      status?: 'success' | 'failed'
    } = {}
  ) {
    return prismadb.webhookDelivery.findMany({
      where: {
        subscriptionId,
        ...(options.status && {
          success: options.status === 'success'
        })
      },
      orderBy: { createdAt: 'desc' },
      take: options.limit || 50,
      skip: options.offset || 0
    })
  }
}
