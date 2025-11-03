/**
 * Audit Logs API
 * Query and export audit logs for compliance
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { AuditAction } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prismadb.users.findUnique({
      where: { id: session.user.id },
      include: {
        organization: true,
      },
    });

    if (!user || !user.organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Only OWNER and ADMIN can view audit logs
    if (!["OWNER", "ADMIN"].includes(user.organization_role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const action = searchParams.get("action") as AuditAction | null;
    const resource = searchParams.get("resource");
    const userId = searchParams.get("userId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const exportFormat = searchParams.get("export"); // csv, json

    // Build filter
    const where: any = {
      organizationId: user.organization.id,
    };

    if (action) {
      where.action = action;
    }

    if (resource) {
      where.resource = resource;
    }

    if (userId) {
      where.userId = userId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // Get total count
    const totalCount = await prismadb.auditLog.count({ where });

    // Get paginated audit logs
    const auditLogs = await prismadb.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Handle CSV export
    if (exportFormat === "csv") {
      const csvRows = [
        "Timestamp,User,Action,Resource,Resource ID,IP Address,Changes",
        ...auditLogs.map((log) =>
          [
            log.createdAt.toISOString(),
            log.user?.email || "System",
            log.action,
            log.resource,
            log.resourceId || "",
            log.ipAddress || "",
            JSON.stringify(log.changes || {}),
          ]
            .map((field) => `"${String(field).replace(/"/g, '""')}"`)
            .join(",")
        ),
      ].join("\n");

      return new NextResponse(csvRows, {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="audit-logs-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    // Handle JSON export
    if (exportFormat === "json") {
      return new NextResponse(JSON.stringify(auditLogs, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="audit-logs-${new Date().toISOString().split("T")[0]}.json"`,
        },
      });
    }

    // Return paginated response
    return NextResponse.json({
      logs: auditLogs,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page * limit < totalCount,
        hasPrev: page > 1,
      },
      filters: {
        action,
        resource,
        userId,
        startDate,
        endDate,
      },
    });
  } catch (error) {
    console.error("Audit logs query error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * Get audit log statistics
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prismadb.users.findUnique({
      where: { id: session.user.id },
      include: {
        organization: true,
      },
    });

    if (!user || !user.organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Only OWNER and ADMIN can view audit statistics
    if (!["OWNER", "ADMIN"].includes(user.organization_role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { startDate, endDate } = await request.json();

    const where: any = {
      organizationId: user.organization.id,
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // Get statistics
    const [totalLogs, actionCounts, resourceCounts, userActivity] =
      await Promise.all([
        prismadb.auditLog.count({ where }),
        prismadb.auditLog.groupBy({
          by: ["action"],
          where,
          _count: true,
        }),
        prismadb.auditLog.groupBy({
          by: ["resource"],
          where,
          _count: true,
        }),
        prismadb.auditLog.groupBy({
          by: ["userId"],
          where,
          _count: true,
          orderBy: {
            _count: {
              userId: "desc",
            },
          },
          take: 10,
        }),
      ]);

    // Get user details for top activity
    const userIds = userActivity
      .map((u) => u.userId)
      .filter((id): id is string => id !== null);

    const users = await prismadb.users.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    return NextResponse.json({
      totalLogs,
      actionCounts: actionCounts.map((a) => ({
        action: a.action,
        count: a._count,
      })),
      resourceCounts: resourceCounts.map((r) => ({
        resource: r.resource,
        count: r._count,
      })),
      topUsers: userActivity.map((u) => ({
        user: u.userId ? userMap.get(u.userId) : null,
        count: u._count,
      })),
    });
  } catch (error) {
    console.error("Audit statistics error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
