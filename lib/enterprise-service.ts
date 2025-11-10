import { prismadb } from '@/lib/prisma'

export class EnterpriseService {
  /**
   * Get or create team structure
   */
  static async getOrCreateTeam(
    tenantId: string,
    teamName: string,
    parentTeamId?: string
  ) {
    let team = await prismadb.enterpriseTeam.findFirst({
      where: {
        tenantId,
        name: teamName
      }
    })

    if (!team) {
      team = await prismadb.enterpriseTeam.create({
        data: {
          tenantId,
          name: teamName,
          parentTeamId
        }
      })
    }

    return team
  }

  /**
   * Create custom role
   */
  static async createCustomRole(data: {
    tenantId: string
    name: string
    description?: string
    permissions: string[]
  }) {
    return prismadb.customRole.create({
      data: {
        tenantId: data.tenantId,
        name: data.name,
        description: data.description,
        permissions: data.permissions,
        isActive: true
      }
    })
  }

  /**
   * List custom roles
   */
  static async listCustomRoles(tenantId: string) {
    return prismadb.customRole.findMany({
      where: { tenantId, isActive: true }
    })
  }

  /**
   * Configure multi-region deployment
   */
  static async configureRegion(
    tenantId: string,
    regionId: string,
    isPrimary: boolean = false
  ) {
    // If this is primary, unset others
    if (isPrimary) {
      await prismadb.tenantRegionAssignment.updateMany({
        where: { tenantId },
        data: { isPrimary: false }
      })
    }

    return prismadb.tenantRegionAssignment.upsert({
      where: {
        tenantId_regionId: {
          tenantId,
          regionId
        }
      },
      create: {
        tenantId,
        regionId,
        isPrimary,
        syncStatus: 'SYNCING'
      },
      update: {
        isPrimary,
        syncStatus: 'SYNCING'
      }
    })
  }

  /**
   * List deployment regions
   */
  static async listDeploymentRegions() {
    return prismadb.deploymentRegion.findMany({
      where: {
        status: 'ACTIVE'
      }
    })
  }

  /**
   * Get tenant region assignments
   */
  static async getTenantRegions(tenantId: string) {
    return prismadb.tenantRegionAssignment.findMany({
      where: { tenantId }
    })
  }

  /**
   * Check feature flag
   */
  static async isFeatureFlagEnabled(
    featureName: string,
    tenantId: string
  ): Promise<boolean> {
    const flag = await prismadb.featureFlag.findUnique({
      where: { name: featureName }
    })

    if (!flag || !flag.isEnabled) {
      return false
    }

    // Check if tenant is in target list
    if (flag.targetTenants.length > 0 && !flag.targetTenants.includes(tenantId)) {
      return false
    }

    // Check rollout percentage
    if (flag.rolloutPercentage < 100) {
      const hash = tenantId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
      const percentage = (hash % 100) + 1
      return percentage <= flag.rolloutPercentage
    }

    return true
  }

  /**
   * Configure cache policy
   */
  static async configureCachePolicy(data: {
    tenantId: string
    resource: string
    ttlSeconds: number
    strategy: 'LRU' | 'LFU' | 'TTL'
    maxSize?: number
  }) {
    return prismadb.cachePolicy.upsert({
      where: {
        tenantId_resource: {
          tenantId: data.tenantId,
          resource: data.resource
        }
      },
      create: {
        tenantId: data.tenantId,
        resource: data.resource,
        ttlSeconds: data.ttlSeconds,
        strategy: data.strategy,
        maxSize: data.maxSize
      },
      update: {
        ttlSeconds: data.ttlSeconds,
        strategy: data.strategy,
        maxSize: data.maxSize
      }
    })
  }

  /**
   * Configure rate limit policy
   */
  static async configureRateLimitPolicy(data: {
    tenantId: string
    name: string
    requestsPerMin: number
    requestsPerHour: number
    requestsPerDay: number
  }) {
    return prismadb.rateLimitPolicy.upsert({
      where: {
        tenantId_name: {
          tenantId: data.tenantId,
          name: data.name
        }
      },
      create: {
        tenantId: data.tenantId,
        name: data.name,
        requestsPerMin: data.requestsPerMin,
        requestsPerHour: data.requestsPerHour,
        requestsPerDay: data.requestsPerDay
      },
      update: {
        requestsPerMin: data.requestsPerMin,
        requestsPerHour: data.requestsPerHour,
        requestsPerDay: data.requestsPerDay
      }
    })
  }

  /**
   * Get SLA metrics
   */
  static async getSLAMetrics(tenantId: string, month: string) {
    return prismadb.sLAMetric.findUnique({
      where: {
        tenantId_month: {
          tenantId,
          month
        }
      }
    })
  }

  /**
   * Record SLA metrics
   */
  static async recordSLAMetrics(data: {
    tenantId: string
    month: string
    uptime: number
    responseTime: number
    errorRate: number
    supportTickets: number
    avgResolutionTime: number
  }) {
    return prismadb.sLAMetric.upsert({
      where: {
        tenantId_month: {
          tenantId: data.tenantId,
          month: data.month
        }
      },
      create: {
        tenantId: data.tenantId,
        month: data.month,
        uptime: data.uptime,
        responseTime: data.responseTime,
        errorRate: data.errorRate,
        supportTickets: data.supportTickets,
        avgResolutionTime: data.avgResolutionTime
      },
      update: {
        uptime: data.uptime,
        responseTime: data.responseTime,
        errorRate: data.errorRate,
        supportTickets: data.supportTickets,
        avgResolutionTime: data.avgResolutionTime
      }
    })
  }

  /**
   * Get enterprise dashboard metrics
   */
  static async getEnterpriseDashboard(tenantId: string) {
    const [regions, customRoles, cachePolicy, rateLimitPolicy, slaMetrics] = await Promise.all([
      this.getTenantRegions(tenantId),
      this.listCustomRoles(tenantId),
      prismadb.cachePolicy.findMany({
        where: { tenantId }
      }),
      prismadb.rateLimitPolicy.findMany({
        where: { tenantId }
      }),
      prismadb.sLAMetric.findMany({
        where: { tenantId },
        orderBy: { month: 'desc' },
        take: 12
      })
    ])

    const currentMonth = new Date().toISOString().substring(0, 7)
    const currentSLA = slaMetrics.find(m => m.month === currentMonth)

    return {
      regions: {
        configured: regions,
        active: regions.filter(r => r.syncStatus === 'SYNCED').length
      },
      rbac: {
        customRoles: customRoles.length,
        permissions: customRoles.flatMap(r => r.permissions).length
      },
      performance: {
        cacheStrategies: cachePolicy.length,
        rateLimitPolicies: rateLimitPolicy.length
      },
      sla: {
        current: currentSLA || null,
        history: slaMetrics
      }
    }
  }
}
