import { prismadb } from '@/lib/prisma'

export class AnalyticsService {
  /**
   * Get financial metrics for tenant
   */
  static async getTenantFinancialMetrics(
    tenantId: string,
    options: {
      startDate: Date
      endDate: Date
    }
  ) {
    const usageMetrics = await prismadb.usageMetric.findMany({
      where: {
        tenantId,
        date: {
          gte: options.startDate,
          lte: options.endDate
        }
      }
    })

    // Calculate metrics from usage data
    const apiCalls = usageMetrics
      .filter(m => m.metricType === 'API_CALLS')
      .reduce((sum, m) => sum + m.value, 0)

    const storageUsedMB = usageMetrics
      .filter(m => m.metricType === 'STORAGE')
      .reduce((sum, m) => sum + m.value, 0)

    return {
      period: {
        start: options.startDate,
        end: options.endDate
      },
      apiCalls,
      storageUsedMB,
      averageDailyApiCalls:
        apiCalls / Math.ceil((options.endDate.getTime() - options.startDate.getTime()) / (1000 * 60 * 60 * 24)),
      storageWarning: storageUsedMB > 1000 ? 'HIGH' : storageUsedMB > 500 ? 'MEDIUM' : 'LOW'
    }
  }

  /**
   * Get user activity metrics
   */
  static async getUserActivityMetrics(tenantId: string) {
    const users = await prismadb.tenantUser.findMany({
      where: { tenantId }
    })

    const sessions = await prismadb.tenantSession.findMany({
      where: {
        tenantUser: {
          tenantId
        }
      },
      include: {
        tenantUser: true
      }
    })

    const activeUsers = new Set(
      sessions
        .filter(s => s.lastActivityAt > new Date(Date.now() - 24 * 60 * 60 * 1000))
        .map(s => s.tenantUser.id)
    ).size

    const inactiveUsers = users.filter(u => {
      const lastActivity = u.lastActivityAt
      return !lastActivity || lastActivity < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    }).length

    return {
      totalUsers: users.length,
      activeUsers,
      inactiveUsers,
      activationRate: users.length > 0 ? (activeUsers / users.length) * 100 : 0,
      users: users.map(u => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`,
        email: u.email,
        role: u.role,
        lastActivity: u.lastActivityAt
      }))
    }
  }

  /**
   * Get churn risk analysis
   */
  static async getChurnRiskAnalysis(tenantId: string) {
    const tenant = await prismadb.tenant.findUnique({
      where: { id: tenantId },
      include: {
        usage: {
          orderBy: { date: 'desc' },
          take: 90
        },
        subscription: true
      }
    })

    if (!tenant) {
      throw new Error('Tenant not found')
    }

    const indicators: Array<{
      indicator: string
      severity: 'LOW' | 'MEDIUM' | 'HIGH'
      description: string
    }> = []

    let riskScore = 0

    // Check usage decline
    if (tenant.usage.length >= 60) {
      const recentUsage = tenant.usage.slice(0, 30)
      const olderUsage = tenant.usage.slice(30, 60)

      const recentAvg =
        recentUsage.reduce((sum, m) => sum + m.value, 0) / recentUsage.length || 0
      const olderAvg =
        olderUsage.reduce((sum, m) => sum + m.value, 0) / olderUsage.length || 0

      if (recentAvg < olderAvg * 0.7) {
        indicators.push({
          indicator: 'USAGE_DECLINE',
          severity: 'HIGH',
          description: 'Usage declined by more than 30% in the last month'
        })
        riskScore += 40
      } else if (recentAvg < olderAvg * 0.85) {
        indicators.push({
          indicator: 'USAGE_DECLINE',
          severity: 'MEDIUM',
          description: 'Usage declined by 15-30% in the last month'
        })
        riskScore += 25
      }
    }

    // Check payment issues
    if (tenant.subscription?.status === 'PAST_DUE') {
      indicators.push({
        indicator: 'PAYMENT_OVERDUE',
        severity: 'HIGH',
        description: 'Payment is overdue'
      })
      riskScore += 35
    }

    if (tenant.subscription?.cancelAtPeriodEnd) {
      indicators.push({
        indicator: 'CANCELLATION_SCHEDULED',
        severity: 'HIGH',
        description: 'Subscription scheduled for cancellation'
      })
      riskScore += 50
    }

    // Check trial status
    if (tenant.status === 'TRIAL_EXPIRED') {
      indicators.push({
        indicator: 'TRIAL_EXPIRED',
        severity: 'HIGH',
        description: 'Trial period has expired'
      })
      riskScore += 45
    }

    // Check plan downgrade
    if (tenant.plan !== 'ENTERPRISE') {
      indicators.push({
        indicator: 'LOWER_TIER_PLAN',
        severity: 'LOW',
        description: 'Not on highest tier plan'
      })
      riskScore += 5
    }

    return {
      riskScore: Math.min(riskScore, 100),
      riskLevel:
        riskScore >= 70 ? 'CRITICAL' : riskScore >= 50 ? 'HIGH' : riskScore >= 30 ? 'MEDIUM' : 'LOW',
      indicators,
      recommendedActions: this.getChurnMitigationActions(indicators)
    }
  }

  /**
   * Get churn mitigation actions
   */
  private static getChurnMitigationActions(
    indicators: Array<{ indicator: string; severity: string }>
  ): string[] {
    const actions: string[] = []

    for (const ind of indicators) {
      switch (ind.indicator) {
        case 'USAGE_DECLINE':
          actions.push('Schedule check-in call with customer success team')
          actions.push('Send feature education email')
          actions.push('Offer onboarding assistance')
          break
        case 'PAYMENT_OVERDUE':
          actions.push('Send payment reminder email')
          actions.push('Contact via phone immediately')
          actions.push('Offer payment plan option')
          break
        case 'CANCELLATION_SCHEDULED':
          actions.push('Immediate outreach with retention offer')
          actions.push('Executive engagement for enterprise accounts')
          break
        case 'TRIAL_EXPIRED':
          actions.push('Send conversion offer email')
          actions.push('Provide extended trial option')
          actions.push('Highlight key value propositions')
          break
        case 'LOWER_TIER_PLAN':
          actions.push('Identify upgrade opportunities')
          actions.push('Send feature comparison email')
          break
      }
    }

    return [...new Set(actions)] // Remove duplicates
  }

  /**
   * Get cohort retention analysis
   */
  static async getCohortRetentionAnalysis(tenantId: string) {
    const users = await prismadb.tenantUser.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' }
    })

    // Group users by signup cohort (month)
    const cohorts: Record<string, TenantUser[]> = {}

    for (const user of users) {
      const cohortKey = user.createdAt.toISOString().substring(0, 7) // YYYY-MM
      if (!cohorts[cohortKey]) {
        cohorts[cohortKey] = []
      }
      cohorts[cohortKey].push(user)
    }

    // Calculate retention for each cohort
    const retentionAnalysis = Object.entries(cohorts).map(([cohort, cohortUsers]) => {
      const activeInCohort = cohortUsers.filter(
        u =>
          u.lastActivityAt &&
          u.lastActivityAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      ).length

      return {
        cohort,
        signups: cohortUsers.length,
        activeUsers: activeInCohort,
        retentionRate: (activeInCohort / cohortUsers.length) * 100
      }
    })

    return retentionAnalysis
  }

  /**
   * Get dashboard summary
   */
  static async getDashboardSummary(tenantId: string) {
    const [tenant, users, sessions, usage, supportTickets] = await Promise.all([
      prismadb.tenant.findUnique({
        where: { id: tenantId },
        include: { subscription: true }
      }),
      prismadb.tenantUser.findMany({
        where: { tenantId }
      }),
      prismadb.tenantSession.findMany({
        where: {
          tenantUser: {
            tenantId
          }
        }
      }),
      prismadb.usageMetric.findMany({
        where: { tenantId },
        orderBy: { date: 'desc' },
        take: 30
      }),
      prismadb.supportTicket.findMany({
        where: { tenantId }
      })
    ])

    const activeUsers = new Set(
      sessions
        .filter(s => s.lastActivityAt > new Date(Date.now() - 24 * 60 * 60 * 1000))
        .map(s => s.tenantUserId)
    ).size

    const openTickets = supportTickets.filter(t => t.status === 'OPEN').length
    const avgTicketResolutionTime =
      supportTickets.filter(t => t.resolvedAt && t.createdAt).length > 0
        ? Math.round(
            supportTickets
              .filter(t => t.resolvedAt && t.createdAt)
              .reduce((sum, t) => sum + (t.resolvedAt!.getTime() - t.createdAt.getTime()), 0) /
              supportTickets.filter(t => t.resolvedAt).length /
              (1000 * 60 * 60)
          )
        : 0

    return {
      tenant: {
        id: tenant?.id,
        name: tenant?.name,
        plan: tenant?.plan,
        status: tenant?.status,
        createdAt: tenant?.createdAt
      },
      users: {
        total: users.length,
        active: activeUsers,
        activationRate: users.length > 0 ? (activeUsers / users.length) * 100 : 0
      },
      subscription: {
        status: tenant?.subscription?.status,
        plan: tenant?.subscription?.stripePriceId,
        currentPeriodEnd: tenant?.subscription?.currentPeriodEnd
      },
      support: {
        openTickets,
        avgResolutionHours: avgTicketResolutionTime,
        totalTickets: supportTickets.length
      },
      usage: {
        lastRecordedAt: usage[0]?.date,
        metrics: usage.map(m => ({
          type: m.metricType,
          value: m.value,
          date: m.date
        }))
      }
    }
  }
}

// Type reference (should match Prisma TenantUser)
interface TenantUser {
  id: string
  createdAt: Date
  lastActivityAt?: Date
}
