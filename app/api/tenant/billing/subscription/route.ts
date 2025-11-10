import { NextRequest } from 'next/server'
import { formatErrorResponse, formatSuccessResponse } from '@/lib/error-handler'
import { getAuthenticatedUser, requireUserType, parseRequestBody } from '@/lib/api-utils'
import { StripeService } from '@/lib/stripe-service'
import { prismadb } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = getAuthenticatedUser(request)
    requireUserType(user, 'tenant')
    const tenantId = 'tenantId' in user ? user.tenantId : null

    if (!tenantId) throw new Error('Tenant ID required')

    const subscription = await prismadb.subscriptions.findFirst({
      where: { organizationId: tenantId }
    })

    if (!subscription) {
      return formatSuccessResponse({ subscription: null })
    }

    const stripeSubscription = await StripeService.getSubscriptionStatus(
      subscription.stripeSubscriptionId
    )

    return formatSuccessResponse({
      subscription: {
        ...subscription,
        stripeStatus: stripeSubscription.status
      }
    })
  } catch (error) {
    return formatErrorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getAuthenticatedUser(request)
    requireUserType(user, 'tenant')
    const tenantId = 'tenantId' in user ? user.tenantId : null

    if (!tenantId) throw new Error('Tenant ID required')

    const body = await parseRequestBody(request)
    const { action, stripePriceId } = body

    if (action === 'update-plan') {
      const currentSubscription = await prismadb.subscriptions.findFirst({
        where: { organizationId: tenantId }
      })

      if (!currentSubscription) {
        throw new Error('No subscription found')
      }

      const updated = await StripeService.updateSubscription(
        currentSubscription.stripeSubscriptionId,
        stripePriceId
      )

      return formatSuccessResponse({ subscription: updated })
    } else if (action === 'cancel') {
      const currentSubscription = await prismadb.subscriptions.findFirst({
        where: { organizationId: tenantId }
      })

      if (!currentSubscription) {
        throw new Error('No subscription found')
      }

      const cancelled = await StripeService.cancelSubscription(
        currentSubscription.stripeSubscriptionId
      )

      return formatSuccessResponse({ subscription: cancelled })
    } else {
      throw new Error('Invalid action')
    }
  } catch (error) {
    return formatErrorResponse(error)
  }
}
