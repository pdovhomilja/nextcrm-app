import { NextRequest } from 'next/server'
import { formatSuccessResponse } from '@/lib/error-handler'
import { getAuthenticatedUser, requireUserType } from '@/lib/api-utils'
import { AuditService } from '@/lib/audit-service'
import { getClientIp, getUserAgent } from '@/lib/api-utils'

export async function POST(request: NextRequest) {
  try {
    const user = getAuthenticatedUser(request)
    requireUserType(user, 'admin')

    const clientIp = getClientIp(request)
    const userAgent = getUserAgent(request)

    // Log logout
    await AuditService.logAdminAction({
      adminUserId: user.userId,
      action: 'LOGOUT',
      resource: 'AUTH',
      statusCode: 200,
      ipAddress: clientIp,
      userAgent
    })

    const response = formatSuccessResponse(
      {
        message: 'Logged out successfully'
      },
      200
    )

    response.cookies.delete('refreshToken')

    return response
  } catch (error) {
    const response = formatSuccessResponse(
      {
        message: 'Logged out successfully'
      },
      200
    )

    response.cookies.delete('refreshToken')

    return response
  }
}
