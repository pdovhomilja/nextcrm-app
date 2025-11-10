import { prismadb } from '@/lib/prisma'

export class AdvancedAnalyticsService {
  /**
   * Generate custom report
   */
  static async generateCustomReport(
    organizationId: string,
    reportId: string,
    options?: {
      startDate?: Date
      endDate?: Date
    }
  ) {
    const report = await prismadb.customReport.findUnique({
      where: { id: reportId }
    })

    if (!report || report.tenantId !== organizationId) {
      throw new Error('Report not found')
    }

    const startDate = options?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const endDate = options?.endDate || new Date()

    // Gather metrics based on report configuration
    const metrics: Record<string, any> = {}

    for (const metricType of report.metrics) {
      if (metricType === 'REVENUE') {
        metrics.revenue = await this.calculateRevenue(organizationId, startDate, endDate)
      } else if (metricType === 'USAGE') {
        metrics.usage = await this.calculateUsage(organizationId, startDate, endDate)
      } else if (metricType === 'USER_ACTIVITY') {
        metrics.userActivity = await this.calculateUserActivity(organizationId, startDate, endDate)
      } else if (metricType === 'CHURN') {
        metrics.churn = await this.calculateChurn(organizationId, startDate, endDate)
      }
    }

    // Log execution
    const execution = await prismadb.reportExecution.create({
      data: {
        reportId,
        tenantId: organizationId,
        status: 'COMPLETED',
        result: metrics,
        completedAt: new Date()
      }
    })

    return {
      report: {
        id: report.id,
        name: report.name,
        type: report.type
      },
      execution,
      metrics
    }
  }

  private static async calculateRevenue(organizationId: string, startDate: Date, endDate: Date) {
    const payments = await prismadb.paymentHistory.findMany({
      where: {
        organizationId: organizationId,
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        status: 'SUCCEEDED'
      }
    })

    return {
      total: payments.reduce((sum, p) => sum + p.amount, 0),
      count: payments.length,
      average: payments.length > 0
        ? payments.reduce((sum, p) => sum + p.amount, 0) / payments.length
        : 0,
      byDate: this.groupByDate(payments, 'createdAt')
    }
  }

  private static async calculateUsage(organizationId: string, startDate: Date, endDate: Date) {
    const metrics = await prismadb.usageMetric.findMany({
      where: {
        tenantId: organizationId,
        date: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    const byType: Record<string, number> = {}
    for (const metric of metrics) {
      byType[metric.metricType] = (byType[metric.metricType] || 0) + metric.value
    }

    return {
      totalMetrics: metrics.length,
      byType,
      trend: this.calculateTrend(metrics.map(m => m.value))
    }
  }

  private static async calculateUserActivity(organizationId: string, startDate: Date, endDate: Date) {
    const sessions = await prismadb.tenantSession.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        tenantUser: {
          tenantId
        }
      }
    })

    const uniqueUsers = new Set(sessions.map(s => s.tenantUserId)).size
    const avgSessionDuration = sessions.length > 0
      ? sessions.reduce((sum, s) => {
          const duration = s.lastActivityAt.getTime() - s.createdAt.getTime()
          return sum + duration
        }, 0) / sessions.length / 1000 / 60 // Convert to minutes
      : 0

    return {
      totalSessions: sessions.length,
      uniqueUsers,
      avgSessionDurationMinutes: Math.round(avgSessionDuration),
      byDay: this.groupByDate(sessions, 'createdAt')
    }
  }

  private static async calculateChurn(organizationId: string, startDate: Date, endDate: Date) {
    const previousPeriod = {
      gte: new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime())),
      lt: startDate
    }

    const currentPeriodUsers = await prismadb.tenantSession.groupBy({
      by: ['tenantUserId'],
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        tenantUser: { tenantId }
      }
    })

    const previousPeriodUsers = await prismadb.tenantSession.groupBy({
      by: ['tenantUserId'],
      where: {
        createdAt: previousPeriod,
        tenantUser: { tenantId }
      }
    })

    const churned = previousPeriodUsers.filter(
      p => !currentPeriodUsers.some(c => c.tenantUserId === p.tenantUserId)
    ).length

    return {
      churnedUsers: churned,
      churnRate: previousPeriodUsers.length > 0
        ? (churned / previousPeriodUsers.length) * 100
        : 0
    }
  }

  private static groupByDate(items: any[], dateField: string): Record<string, number> {
    const grouped: Record<string, number> = {}
    for (const item of items) {
      const date = item[dateField].toISOString().split('T')[0]
      grouped[date] = (grouped[date] || 0) + 1
    }
    return grouped
  }

  private static calculateTrend(values: number[]): string {
    if (values.length < 2) return 'STABLE'
    const first = values.slice(0, Math.floor(values.length / 2))
    const second = values.slice(Math.floor(values.length / 2))
    const firstAvg = first.reduce((a, b) => a + b, 0) / first.length
    const secondAvg = second.reduce((a, b) => a + b, 0) / second.length
    if (secondAvg > firstAvg * 1.1) return 'UP'
    if (secondAvg < firstAvg * 0.9) return 'DOWN'
    return 'STABLE'
  }

  /**
   * Export data to CSV
   */
  static async exportData(
    organizationId: string,
    resourceType: string,
    options?: { startDate?: Date; endDate?: Date }
  ): Promise<string> {
    const bulkOp = await prismadb.bulkOperation.create({
      data: {
        tenantId: organizationId,
        operationType: 'EXPORT',
        resourceType,
        totalRecords: 0,
        status: 'PROCESSING'
      }
    })

    try {
      let data: any[] = []

      if (resourceType === 'USERS') {
        data = await prismadb.tenantUser.findMany({
          where: { tenantId: organizationId }
        })
      } else if (resourceType === 'USAGE_METRICS') {
        data = await prismadb.usageMetric.findMany({
          where: {
            tenantId: organizationId,
            ...(options?.startDate && options?.endDate && {
              date: {
                gte: options.startDate,
                lte: options.endDate
              }
            })
          }
        })
      }

      // Convert to CSV
      const headers = data.length > 0 ? Object.keys(data[0]) : []
      const csv = [
        headers.join(','),
        ...data.map(row =>
          headers.map(h => {
            const val = row[h]
            return typeof val === 'string' && val.includes(',')
              ? `"${val}"`
              : val
          }).join(',')
        )
      ].join('\n')

      await prismadb.bulkOperation.update({
        where: { id: bulkOp.id },
        data: {
          status: 'COMPLETED',
          processedRecords: data.length,
          totalRecords: data.length,
          completedAt: new Date()
        }
      })

      return csv
    } catch (error) {
      await prismadb.bulkOperation.update({
        where: { id: bulkOp.id },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }
      })
      throw error
    }
  }
}
