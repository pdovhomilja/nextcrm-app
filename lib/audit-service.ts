import { prismadb } from '@/lib/prisma'

export interface AdminAuditLogEntry {
  adminUserId: string
  action: string
  resource: string
  resourceId?: string
  changes?: Record<string, any>
  statusCode?: number
  errorMessage?: string
  ipAddress?: string
  userAgent?: string
  tenantId?: string
  tenantUserId?: string
}

export class AuditService {
  /**
   * Log admin action
   */
  static async logAdminAction(entry: AdminAuditLogEntry): Promise<void> {
    try {
      await prismadb.adminAuditLog.create({
        data: {
          adminUserId: entry.adminUserId,
          action: entry.action,
          resource: entry.resource,
          resourceId: entry.resourceId,
          changes: entry.changes,
          statusCode: entry.statusCode,
          errorMessage: entry.errorMessage,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          tenantId: entry.tenantId,
          tenantUserId: entry.tenantUserId
        }
      })
    } catch (error) {
      console.error('Failed to log audit entry:', error)
      // Don't throw - logging failures shouldn't break the main operation
    }
  }

  /**
   * Get audit logs for tenant
   */
  static async getTenantAuditLog(
    tenantId: string,
    options: {
      startDate?: Date
      endDate?: Date
      action?: string
      limit?: number
      offset?: number
    } = {}
  ) {
    const { startDate, endDate, action, limit = 100, offset = 0 } = options

    return prismadb.adminAuditLog.findMany({
      where: {
        tenantId,
        ...(startDate && endDate && {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        }),
        ...(action && { action })
      },
      include: {
        adminUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 1000),
      skip: offset
    })
  }

  /**
   * Get audit logs for admin user
   */
  static async getAdminUserAuditLog(
    adminUserId: string,
    options: {
      limit?: number
      offset?: number
    } = {}
  ) {
    const { limit = 100, offset = 0 } = options

    return prismadb.adminAuditLog.findMany({
      where: { adminUserId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 1000),
      skip: offset
    })
  }

  /**
   * Get audit logs for specific action
   */
  static async getActionAuditLog(
    action: string,
    options: {
      limit?: number
      offset?: number
      startDate?: Date
      endDate?: Date
    } = {}
  ) {
    const { limit = 100, offset = 0, startDate, endDate } = options

    return prismadb.adminAuditLog.findMany({
      where: {
        action,
        ...(startDate && endDate && {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        })
      },
      include: {
        adminUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 1000),
      skip: offset
    })
  }

  /**
   * Count audit logs for tenant
   */
  static async countTenantAuditLogs(tenantId: string): Promise<number> {
    return prismadb.adminAuditLog.count({
      where: { tenantId }
    })
  }

  /**
   * Export audit logs to CSV
   */
  static async exportAuditLogsToCSV(
    tenantId: string,
    options: {
      startDate?: Date
      endDate?: Date
    } = {}
  ): Promise<string> {
    const logs = await this.getTenantAuditLog(tenantId, {
      ...options,
      limit: 10000,
      offset: 0
    })

    const headers = ['Date', 'Admin', 'Action', 'Resource', 'Status', 'IP Address']
    const rows = logs.map(log => [
      log.createdAt.toISOString(),
      `${log.adminUser.firstName} ${log.adminUser.lastName}`,
      log.action,
      log.resource,
      log.statusCode || 'N/A',
      log.ipAddress || 'unknown'
    ])

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    return csv
  }

  /**
   * Get audit summary for dashboard
   */
  static async getAuditSummary(tenantId: string) {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const [
      actionsLast24h,
      actionsLast7d,
      recentLogs,
      adminCount
    ] = await Promise.all([
      prismadb.adminAuditLog.count({
        where: {
          tenantId,
          createdAt: { gte: last24Hours }
        }
      }),
      prismadb.adminAuditLog.count({
        where: {
          tenantId,
          createdAt: { gte: last7Days }
        }
      }),
      prismadb.adminAuditLog.findMany({
        where: { tenantId },
        include: {
          adminUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      prismadb.adminAuditLog.groupBy({
        by: ['adminUserId'],
        where: { tenantId },
        _count: true
      })
    ])

    return {
      actionsLast24h,
      actionsLast7d,
      totalAdmins: adminCount.length,
      recentLogs,
      topAdmins: adminCount
        .sort((a, b) => (b._count || 0) - (a._count || 0))
        .slice(0, 5)
    }
  }
}
