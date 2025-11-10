import { NextRequest } from 'next/server'
import { formatErrorResponse, formatSuccessResponse } from '@/lib/error-handler'
import { getAuthenticatedUser, requireUserType } from '@/lib/api-utils'
import { prismadb } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = getAuthenticatedUser(request)
    requireUserType(user, 'admin')

    // Get full user details
    const adminUser = await prismadb.adminUser.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        department: true,
        isActive: true,
        mfaEnabled: true,
        lastLoginAt: true
      }
    })

    if (!adminUser) {
      throw new Error('User not found')
    }

    return formatSuccessResponse({
      user: adminUser
    })
  } catch (error) {
    return formatErrorResponse(error)
  }
}
