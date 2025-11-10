import { prismadb } from '@/lib/prisma'
import { EmailService } from '@/lib/email-service'
import { AuthService } from '@/lib/auth-service'

export class TenantService {
  /**
   * Create new tenant
   */
  static async createTenant(data: {
    name: string
    subdomain: string
    slug?: string
    plan: string
    primaryContactId?: string
    website?: string
    description?: string
    businessDetails?: Record<string, any>
  }) {
    // Validate subdomain uniqueness
    const existingTenant = await prismadb.tenant.findUnique({
      where: { subdomain: data.subdomain }
    })

    if (existingTenant) {
      throw new Error('Subdomain already in use')
    }

    const tenant = await prismadb.tenant.create({
      data: {
        name: data.name,
        subdomain: data.subdomain,
        slug: data.slug || data.subdomain,
        plan: data.plan as any,
        primaryContactId: data.primaryContactId,
        website: data.website,
        description: data.description,
        businessDetails: data.businessDetails || {}
      }
    })

    return tenant
  }

  /**
   * Get tenant by ID
   */
  static async getTenant(id: string) {
    return prismadb.tenant.findUnique({
      where: { id },
      include: {
        primaryContact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        },
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            isActive: true
          }
        },
        subscription: true
      }
    })
  }

  /**
   * Get tenant by subdomain
   */
  static async getTenantBySubdomain(subdomain: string) {
    return prismadb.tenant.findUnique({
      where: { subdomain },
      include: {
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        }
      }
    })
  }

  /**
   * List all tenants with pagination
   */
  static async listTenants(options: {
    status?: string
    plan?: string
    search?: string
    limit?: number
    offset?: number
  } = {}) {
    const { status, plan, search, limit = 50, offset = 0 } = options

    const [tenants, total] = await Promise.all([
      prismadb.tenant.findMany({
        where: {
          ...(status && { status: status as any }),
          ...(plan && { plan: plan as any }),
          ...(search && {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { subdomain: { contains: search, mode: 'insensitive' } }
            ]
          })
        },
        include: {
          primaryContact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          users: true,
          subscription: true
        },
        orderBy: { createdAt: 'desc' },
        take: Math.min(limit, 500),
        skip: offset
      }),
      prismadb.tenant.count({
        where: {
          ...(status && { status: status as any }),
          ...(plan && { plan: plan as any }),
          ...(search && {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { subdomain: { contains: search, mode: 'insensitive' } }
            ]
          })
        }
      })
    ])

    return { tenants, total, limit, offset }
  }

  /**
   * Update tenant
   */
  static async updateTenant(id: string, data: Record<string, any>) {
    return prismadb.tenant.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      }
    })
  }

  /**
   * Suspend tenant
   */
  static async suspendTenant(id: string, reason: string) {
    const tenant = await prismadb.tenant.update({
      where: { id },
      data: {
        status: 'SUSPENDED',
        updatedAt: new Date()
      },
      include: { primaryContact: true }
    })

    // Notify tenant
    if (tenant.primaryContact) {
      await EmailService.sendTenantSuspendedNotification(
        tenant.primaryContact.email,
        {
          tenantName: tenant.name,
          reason,
          supportUrl: `${process.env.NEXT_PUBLIC_APP_URL}/support`
        }
      ).catch(err => console.error('Failed to send suspension email:', err))
    }

    return tenant
  }

  /**
   * Reactivate tenant
   */
  static async reactivateTenant(id: string) {
    return prismadb.tenant.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        updatedAt: new Date()
      }
    })
  }

  /**
   * Delete tenant (soft delete)
   */
  static async deleteTenant(id: string) {
    return prismadb.tenant.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        deletedAt: new Date(),
        updatedAt: new Date()
      }
    })
  }

  /**
   * Add user to tenant
   */
  static async addUserToTenant(
    tenantId: string,
    data: {
      firstName: string
      lastName: string
      email: string
      password: string
      role: string
    }
  ) {
    // Check if user exists
    const existingUser = await prismadb.tenantUser.findFirst({
      where: {
        tenantId,
        email: data.email
      }
    })

    if (existingUser) {
      throw new Error('User already exists in this tenant')
    }

    const hashedPassword = await AuthService.hashPassword(data.password)

    return prismadb.tenantUser.create({
      data: {
        tenantId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: hashedPassword,
        role: data.role as any
      }
    })
  }

  /**
   * Remove user from tenant
   */
  static async removeUserFromTenant(tenantId: string, userId: string) {
    return prismadb.tenantUser.delete({
      where: {
        id: userId
      }
    })
  }

  /**
   * Update user role
   */
  static async updateUserRole(tenantId: string, userId: string, role: string) {
    return prismadb.tenantUser.update({
      where: { id: userId },
      data: { role: role as any }
    })
  }

  /**
   * Get tenant usage metrics
   */
  static async getTenantUsageMetrics(
    tenantId: string,
    options: {
      startDate?: Date
      endDate?: Date
      limit?: number
    } = {}
  ) {
    const { startDate, endDate, limit = 90 } = options

    return prismadb.usageMetric.findMany({
      where: {
        tenantId,
        ...(startDate && endDate && {
          date: {
            gte: startDate,
            lte: endDate
          }
        })
      },
      orderBy: { date: 'asc' },
      take: limit
    })
  }

  /**
   * Record usage metric
   */
  static async recordUsageMetric(
    tenantId: string,
    metricType: string,
    value: number,
    details?: Record<string, any>
  ) {
    return prismadb.usageMetric.create({
      data: {
        tenantId,
        metricType,
        value,
        details: details || {},
        date: new Date()
      }
    })
  }

  /**
   * Check if tenant has exceeded quota
   */
  static async checkTenantQuota(tenantId: string) {
    const tenant = await this.getTenant(tenantId)

    if (!tenant) {
      throw new Error('Tenant not found')
    }

    // Define quotas by plan
    const quotas: Record<string, Record<string, number>> = {
      PROFESSIONAL: {
        users: 5,
        apiCallsPerDay: 10000
      },
      PERFORMANCE: {
        users: 20,
        apiCallsPerDay: 100000
      },
      ENTERPRISE: {
        users: 999,
        apiCallsPerDay: 999999
      }
    }

    const plan = quotas[tenant.plan]
    const userCount = tenant.users.length

    return {
      plan: tenant.plan,
      userCount,
      userQuota: plan.users,
      userUsagePercent: (userCount / plan.users) * 100,
      exceedsQuota: userCount > plan.users
    }
  }

  /**
   * Enable integration
   */
  static async enableIntegration(
    tenantId: string,
    type: string,
    name: string,
    credentials: Record<string, any>
  ) {
    return prismadb.tenantIntegration.create({
      data: {
        tenantId,
        type: type as any,
        name,
        credentials
      }
    })
  }

  /**
   * Get integration
   */
  static async getIntegration(tenantId: string, type: string) {
    return prismadb.tenantIntegration.findFirst({
      where: {
        tenantId,
        type: type as any
      }
    })
  }

  /**
   * List tenant integrations
   */
  static async listIntegrations(tenantId: string) {
    return prismadb.tenantIntegration.findMany({
      where: { tenantId }
    })
  }

  /**
   * Disable integration
   */
  static async disableIntegration(tenantId: string, integrationId: string) {
    return prismadb.tenantIntegration.update({
      where: { id: integrationId },
      data: { isActive: false }
    })
  }
}
