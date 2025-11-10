import { NextRequest } from 'next/server'
import { formatErrorResponse, formatSuccessResponse } from '@/lib/error-handler'
import { getAuthenticatedUser, requireUserType, getPaginationParams, parseRequestBody } from '@/lib/api-utils'
import { WebhookService } from '@/lib/webhook-service'

export async function GET(request: NextRequest) {
  try {
    const user = getAuthenticatedUser(request)
    requireUserType(user, 'tenant')
    const tenantId = 'tenantId' in user ? user.tenantId : null

    if (!tenantId) throw new Error('Tenant ID required')

    const subscriptions = await WebhookService.listSubscriptions(tenantId)
    return formatSuccessResponse({ subscriptions })
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
    const { url, events } = body

    if (!url || !events || events.length === 0) {
      throw new Error('URL and events array required')
    }

    const subscription = await WebhookService.createSubscription({
      tenantId,
      url,
      events
    })

    return formatSuccessResponse(subscription, 201)
  } catch (error) {
    return formatErrorResponse(error)
  }
}
