import { NextRequest } from 'next/server'
import { formatErrorResponse, formatSuccessResponse } from '@/lib/error-handler'
import { getAuthenticatedUser, requireUserType, getPaginationParams, parseRequestBody } from '@/lib/api-utils'
import { APIKeyService } from '@/lib/api-key-service'

export async function GET(request: NextRequest) {
  try {
    const user = getAuthenticatedUser(request)
    requireUserType(user, 'tenant')
    const tenantId = 'tenantId' in user ? user.tenantId : null

    if (!tenantId) throw new Error('Tenant ID required')

    const keys = await APIKeyService.listAPIKeys(tenantId)
    return formatSuccessResponse({ keys })
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
    const { name, permissions } = body

    if (!name) throw new Error('API key name required')

    const key = await APIKeyService.createAPIKey({
      tenantId,
      name,
      permissions: permissions || ['*']
    })

    return formatSuccessResponse(key, 201)
  } catch (error) {
    return formatErrorResponse(error)
  }
}
