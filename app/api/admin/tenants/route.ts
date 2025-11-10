import { NextRequest } from 'next/server'
import { formatErrorResponse, formatSuccessResponse } from '@/lib/error-handler'
import { getAuthenticatedUser, requireUserType, requireRole, getPaginationParams, getFilterParams } from '@/lib/api-utils'
import { TenantService } from '@/lib/tenant-service'
import { AuditService } from '@/lib/audit-service'
import { getClientIp, getUserAgent, parseRequestBody } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  try {
    const user = getAuthenticatedUser(request)
    requireUserType(user, 'admin')
    requireRole(user, ['SUPER_ADMIN', 'ADMIN'])

    const { limit, offset } = getPaginationParams(request)
    const filters = getFilterParams(request)

    const { tenants, total } = await TenantService.listTenants({
      ...filters,
      limit,
      offset
    })

    return formatSuccessResponse({
      tenants,
      pagination: { total, limit, offset }
    })
  } catch (error) {
    return formatErrorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getAuthenticatedUser(request)
    requireUserType(user, 'admin')
    requireRole(user, ['SUPER_ADMIN'])

    const body = await parseRequestBody(request)
    const { name, subdomain, slug, plan, website, description, businessDetails } = body

    // Validate required fields
    if (!name || !subdomain || !plan) {
      throw new Error('Missing required fields: name, subdomain, plan')
    }

    const tenant = await TenantService.createTenant({
      name,
      subdomain,
      slug: slug || subdomain,
      plan,
      website,
      description,
      businessDetails
    })

    const clientIp = getClientIp(request)
    const userAgent = getUserAgent(request)

    // Log action
    await AuditService.logAdminAction({
      adminUserId: user.userId,
      action: 'TENANT_CREATED',
      resource: 'TENANT',
      resourceId: tenant.id,
      changes: { name, subdomain, plan },
      statusCode: 201,
      ipAddress: clientIp,
      userAgent
    })

    return formatSuccessResponse(tenant, 201)
  } catch (error) {
    return formatErrorResponse(error)
  }
}
