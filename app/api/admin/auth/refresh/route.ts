import { NextRequest } from 'next/server'
import { AuthService } from '@/lib/auth-service'
import { formatErrorResponse, formatSuccessResponse, UnauthorizedError } from '@/lib/error-handler'
import { getClientIp, getUserAgent } from '@/lib/api-utils'
import { AuditService } from '@/lib/audit-service'

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('refreshToken')?.value

    if (!refreshToken) {
      throw new UnauthorizedError('Refresh token not found')
    }

    const clientIp = getClientIp(request)
    const userAgent = getUserAgent(request)

    const { tokens } = await AuthService.refreshAdminAccessToken(refreshToken)

    // Log token refresh
    const payload = AuthService.verifyToken(tokens.accessToken)
    if ('userId' in payload) {
      await AuditService.logAdminAction({
        adminUserId: payload.userId,
        action: 'TOKEN_REFRESHED',
        resource: 'AUTH',
        statusCode: 200,
        ipAddress: clientIp,
        userAgent
      })
    }

    const response = formatSuccessResponse(
      {
        accessToken: tokens.accessToken
      },
      200
    )

    response.cookies.set('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60
    })

    return response
  } catch (error) {
    return formatErrorResponse(error)
  }
}
