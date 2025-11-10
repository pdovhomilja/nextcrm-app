import { NextRequest } from 'next/server'
import { formatErrorResponse, formatSuccessResponse, NotFoundError } from '@/lib/error-handler'
import { getAuthenticatedUser, requireUserType, requireRole, parseRequestBody } from '@/lib/api-utils'
import { TenantService } from '@/lib/tenant-service'
import { AuditService } from '@/lib/audit-service'
import { getClientIp, getUserAgent } from '@/lib/api-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    const user = getAuthenticatedUser(request)
    requireUserType(user, 'admin')
    requireRole(user, ['SUPER_ADMIN', 'ADMIN'])

    const tenant = await TenantService.getTenant(params.tenantId)

    if (!tenant) {
      throw new NotFoundError('Tenant not found')
    }

    return formatSuccessResponse(tenant)
  } catch (error) {
    return formatErrorResponse(error)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    const user = getAuthenticatedUser(request)
    requireUserType(user, 'admin')
    requireRole(user, ['SUPER_ADMIN', 'ADMIN'])

    const body = await parseRequestBody(request)
    const clientIp = getClientIp(request)
    const userAgent = getUserAgent(request)

    const tenant = await TenantService.updateTenant(params.tenantId, body)

    // Log action
    await AuditService.logAdminAction({
      adminUserId: user.userId,
      action: 'TENANT_UPDATED',
      resource: 'TENANT',
      resourceId: tenant.id,
      changes: body,
      statusCode: 200,
      ipAddress: clientIp,
      userAgent,
      tenantId: tenant.id
    })

    return formatSuccessResponse(tenant)
  } catch (error) {
    return formatErrorResponse(error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    const user = getAuthenticatedUser(request)
    requireUserType(user, 'admin')
    requireRole(user, ['SUPER_ADMIN'])

    const clientIp = getClientIp(request)
    const userAgent = getUserAgent(request)

    const tenant = await TenantService.deleteTenant(params.tenantId)

    // Log action
    await AuditService.logAdminAction({
      adminUserId: user.userId,
      action: 'TENANT_DELETED',
      resource: 'TENANT',
      resourceId: tenant.id,
      statusCode: 200,
      ipAddress: clientIp,
      userAgent,
      tenantId: tenant.id
    })

    return formatSuccessResponse({
      message: 'Tenant deleted successfully',
      tenant
    })
  } catch (error) {
    return formatErrorResponse(error)
  }
}
