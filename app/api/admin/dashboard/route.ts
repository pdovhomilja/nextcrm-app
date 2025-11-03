/**
 * Admin Dashboard API
 * System-wide statistics and monitoring for system administrators
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is system admin
    const user = await prismadb.users.findUnique({
      where: { id: session.user.id },
    });

    if (!user || !user.is_admin) {
      return NextResponse.json(
        { error: "System administrator access required" },
        { status: 403 }
      );
    }

    // Get system-wide statistics
    const [
      totalOrganizations,
      activeOrganizations,
      suspendedOrganizations,
      totalUsers,
      activeUsers,
      totalContacts,
      totalAccounts,
      totalLeads,
      totalOpportunities,
      totalDocuments,
      totalInvoices,
      totalProjects,
      totalTasks,
      activeSubscriptions,
      recentAuditLogs,
    ] = await Promise.all([
      prismadb.organizations.count(),
      prismadb.organizations.count({ where: { status: "ACTIVE" } }),
      prismadb.organizations.count({ where: { status: "SUSPENDED" } }),
      prismadb.users.count(),
      prismadb.users.count({ where: { userStatus: "ACTIVE" } }),
      prismadb.crm_Contacts.count(),
      prismadb.crm_Accounts.count(),
      prismadb.crm_Leads.count(),
      prismadb.crm_Opportunities.count(),
      prismadb.documents.count(),
      prismadb.invoices.count(),
      prismadb.boards.count(),
      prismadb.tasks.count(),
      prismadb.subscriptions.count({ where: { status: "ACTIVE" } }),
      prismadb.auditLog.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
          organization: {
            select: {
              name: true,
            },
          },
        },
      }),
    ]);

    // Get organizations by plan
    const organizationsByPlan = await prismadb.organizations.groupBy({
      by: ["plan"],
      _count: true,
    });

    // Get growth data (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [newOrganizations, newUsers] = await Promise.all([
      prismadb.organizations.count({
        where: {
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      prismadb.users.count({
        where: {
          created_on: { gte: thirtyDaysAgo },
        },
      }),
    ]);

    // Get storage usage
    const storageUsage = await prismadb.organizationUsage.aggregate({
      _sum: {
        storageBytes: true,
      },
    });

    // Get recent errors (from audit logs with errors)
    const recentErrors = await prismadb.auditLog.findMany({
      where: {
        OR: [
          { resource: { contains: "error" } },
          { action: "DELETE" },
        ],
      },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        organization: {
          select: {
            name: true,
          },
        },
      },
    });

    // Calculate system health score
    const healthScore = calculateHealthScore({
      activeOrganizations,
      totalOrganizations,
      activeUsers,
      totalUsers,
      activeSubscriptions,
    });

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      healthScore,
      statistics: {
        organizations: {
          total: totalOrganizations,
          active: activeOrganizations,
          suspended: suspendedOrganizations,
          new30Days: newOrganizations,
          byPlan: organizationsByPlan.map((p) => ({
            plan: p.plan,
            count: p._count,
          })),
        },
        users: {
          total: totalUsers,
          active: activeUsers,
          new30Days: newUsers,
        },
        crm: {
          contacts: totalContacts,
          accounts: totalAccounts,
          leads: totalLeads,
          opportunities: totalOpportunities,
        },
        content: {
          documents: totalDocuments,
          invoices: totalInvoices,
          projects: totalProjects,
          tasks: totalTasks,
        },
        subscriptions: {
          active: activeSubscriptions,
        },
        storage: {
          totalBytes: storageUsage._sum.storageBytes || 0,
          totalGB: Math.round(
            (storageUsage._sum.storageBytes || 0) / 1024 / 1024 / 1024
          ),
        },
      },
      recentActivity: recentAuditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        resource: log.resource,
        user: log.user,
        organization: log.organization,
        timestamp: log.createdAt,
      })),
      recentErrors: recentErrors.map((error) => ({
        id: error.id,
        action: error.action,
        resource: error.resource,
        organization: error.organization,
        timestamp: error.createdAt,
      })),
      system: {
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: process.platform,
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        },
      },
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * Calculate system health score (0-100)
 */
function calculateHealthScore(metrics: {
  activeOrganizations: number;
  totalOrganizations: number;
  activeUsers: number;
  totalUsers: number;
  activeSubscriptions: number;
}): number {
  let score = 0;

  // Active organizations ratio (40 points)
  if (metrics.totalOrganizations > 0) {
    score +=
      (metrics.activeOrganizations / metrics.totalOrganizations) * 40;
  } else {
    score += 40;
  }

  // Active users ratio (40 points)
  if (metrics.totalUsers > 0) {
    score += (metrics.activeUsers / metrics.totalUsers) * 40;
  } else {
    score += 40;
  }

  // Active subscriptions (20 points)
  if (metrics.activeSubscriptions > 0) {
    score += 20;
  }

  return Math.round(score);
}
