import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth-service'
import { AuditService } from '@/lib/audit-service'
import { formatErrorResponse, formatSuccessResponse, ValidationError } from '@/lib/error-handler'
import { getClientIp, getUserAgent, isValidEmail, parseRequestBody } from '@/lib/api-utils'

export async function POST(request: NextRequest) {
  try {
    const body = await parseRequestBody(request)
    const { email, password } = body
    const clientIp = getClientIp(request)
    const userAgent = getUserAgent(request)

    // Validate input
    if (!email || !isValidEmail(email)) {
      throw new ValidationError('Valid email is required')
    }

    if (!password || password.length < 1) {
      throw new ValidationError('Password is required')
    }

    // Attempt login
    const { user, tokens } = await AuthService.adminLogin(email, password)

    // Log successful login
    await AuditService.logAdminAction({
      adminUserId: user.id,
      action: 'LOGIN_SUCCESS',
      resource: 'AUTH',
      statusCode: 200,
      ipAddress: clientIp,
      userAgent
    })

    // Set secure cookie for refresh token
    const response = formatSuccessResponse(
      {
        user,
        accessToken: tokens.accessToken
      },
      200
    )

    response.cookies.set('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    })

    return response
  } catch (error) {
    const clientIp = getClientIp(request)
    const userAgent = getUserAgent(request)

    // Log failed login attempt
    if (error instanceof ValidationError) {
      await AuditService.logAdminAction({
        adminUserId: 'unknown',
        action: 'LOGIN_FAILED',
        resource: 'AUTH',
        statusCode: error.statusCode,
        errorMessage: error.message,
        ipAddress: clientIp,
        userAgent
      })
    }

    return formatErrorResponse(error)
  }
}
