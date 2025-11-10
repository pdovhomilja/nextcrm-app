import { NextRequest } from 'next/server'
import { AuthService, JWTPayload } from '@/lib/auth-service'
import { UnauthorizedError, ForbiddenError } from '@/lib/error-handler'

/**
 * Extract and verify JWT token from Authorization header
 */
export function getTokenFromHeader(request: NextRequest): string {
  const authHeader = request.headers.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid Authorization header')
  }

  return authHeader.slice(7) // Remove 'Bearer ' prefix
}

/**
 * Get authenticated user from request
 */
export function getAuthenticatedUser(request: NextRequest): JWTPayload {
  const token = getTokenFromHeader(request)

  try {
    return AuthService.verifyToken(token)
  } catch (error) {
    throw new UnauthorizedError(
      error instanceof Error ? error.message : 'Invalid token'
    )
  }
}

/**
 * Require specific role for endpoint
 */
export function requireRole(user: JWTPayload, allowedRoles: string[]) {
  if (!allowedRoles.includes(user.role)) {
    throw new ForbiddenError(
      `This action requires one of the following roles: ${allowedRoles.join(', ')}`
    )
  }
}

/**
 * Require specific user type (admin or tenant)
 */
export function requireUserType(user: JWTPayload, type: 'admin' | 'tenant') {
  if (user.type !== type) {
    throw new ForbiddenError(`This endpoint is only available for ${type} users`)
  }
}

/**
 * Require tenant access (for tenant endpoints)
 */
export function requireTenantAccess(user: JWTPayload) {
  requireUserType(user, 'tenant')

  if (!('tenantId' in user) || !user.tenantId) {
    throw new ForbiddenError('Tenant access required')
  }

  return user.tenantId
}

/**
 * Parse JSON from request body with error handling
 */
export async function parseRequestBody(request: NextRequest) {
  try {
    return await request.json()
  } catch (error) {
    throw new Error('Invalid JSON in request body')
  }
}

/**
 * Get pagination parameters from request
 */
export function getPaginationParams(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 500)
  const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)

  return { limit, offset }
}

/**
 * Get sorting parameters from request
 */
export function getSortingParams(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const sortBy = searchParams.get('sortBy') || 'createdAt'
  const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc'

  return { sortBy, sortOrder }
}

/**
 * Get filter parameters from request (generic)
 */
export function getFilterParams(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const filters: Record<string, any> = {}

  // Add common filters
  const status = searchParams.get('status')
  if (status) filters.status = status

  const search = searchParams.get('search')
  if (search) filters.search = search

  const startDate = searchParams.get('startDate')
  if (startDate) filters.startDate = new Date(startDate)

  const endDate = searchParams.get('endDate')
  if (endDate) filters.endDate = new Date(endDate)

  return filters
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate password strength
 */
export function isStrongPassword(password: string): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*)')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Generate random token
 */
export function generateToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

/**
 * Generate unique ticket number
 */
export function generateTicketNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `TKT-${timestamp}-${random}`
}

/**
 * Get client IP address
 */
export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  return request.headers.get('x-real-ip') || 'unknown'
}

/**
 * Get user agent
 */
export function getUserAgent(request: NextRequest): string {
  return request.headers.get('user-agent') || 'unknown'
}
