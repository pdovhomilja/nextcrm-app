/**
 * Data Export API - GDPR Compliance
 * Exports all organization data as JSON
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { logExport } from "@/lib/audit-logger";

const RATE_LIMIT_HOURS = 1;
const RATE_LIMIT_MS = RATE_LIMIT_HOURS * 60 * 60 * 1000;

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user with organization
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

    // Only OWNER can export data
    if (user.organization_role !== "OWNER") {
      return NextResponse.json(
        { error: "Only organization owners can export data" },
        { status: 403 }
      );
    }

    // Check rate limit (1 export per hour)
    const recentExport = await prismadb.dataExport.findFirst({
      where: {
        organizationId: user.organization.id,
        createdAt: {
          gte: new Date(Date.now() - RATE_LIMIT_MS),
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (recentExport) {
      const nextAvailableTime = new Date(
        recentExport.createdAt.getTime() + RATE_LIMIT_MS
      );
      const minutesRemaining = Math.ceil(
        (nextAvailableTime.getTime() - Date.now()) / 1000 / 60
      );

      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          message: `You can request a new export in ${minutesRemaining} minutes`,
          nextAvailableAt: nextAvailableTime.toISOString(),
        },
        { status: 429 }
      );
    }

    const organizationId = user.organization.id;

    // Fetch all organization data
    const [
      users,
      contacts,
      accounts,
      leads,
      opportunities,
      invoices,
      documents,
      projects,
      tasks,
      contracts,
    ] = await Promise.all([
      prismadb.users.findMany({
        where: { organizationId },
        select: {
          id: true,
          name: true,
          email: true,
          organization_role: true,
          created_on: true,
          lastLoginAt: true,
        },
      }),
      prismadb.crm_Contacts.findMany({
        where: { organizationId },
      }),
      prismadb.crm_Accounts.findMany({
        where: { organizationId },
      }),
      prismadb.crm_Leads.findMany({
        where: { organizationId },
      }),
      prismadb.crm_Opportunities.findMany({
        where: { organizationId },
      }),
      prismadb.invoices.findMany({
        where: { organizationId },
      }),
      prismadb.documents.findMany({
        where: { organizationId },
        select: {
          id: true,
          document_name: true,
          description: true,
          document_type: true,
          createdAt: true,
          size: true,
          document_file_mimeType: true,
          // Exclude actual file URLs for security
        },
      }),
      prismadb.boards.findMany({
        where: { organizationId },
      }),
      prismadb.tasks.findMany({
        where: { organizationId },
      }),
      prismadb.crm_Contracts.findMany({
        where: { organizationId },
      }),
    ]);

    // Create export data object
    const exportData = {
      exportDate: new Date().toISOString(),
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        slug: user.organization.slug,
        plan: user.organization.plan,
        createdAt: user.organization.createdAt,
      },
      statistics: {
        users: users.length,
        contacts: contacts.length,
        accounts: accounts.length,
        leads: leads.length,
        opportunities: opportunities.length,
        invoices: invoices.length,
        documents: documents.length,
        projects: projects.length,
        tasks: tasks.length,
        contracts: contracts.length,
      },
      data: {
        users,
        contacts,
        accounts,
        leads,
        opportunities,
        invoices,
        documents,
        projects,
        tasks,
        contracts,
      },
    };

    // Create export record
    const dataExport = await prismadb.dataExport.create({
      data: {
        organizationId: user.organization.id,
        userId: user.id,
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    // Log export action
    await logExport("organization_data", {
      organizationId: user.organization.id,
      userId: user.id,
    });

    // Return export data as JSON
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="nextcrm-export-${user.organization.slug}-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error) {
    console.error("Data export error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// Get export history
export async function GET() {
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

    // Only OWNER can view export history
    if (user.organization_role !== "OWNER") {
      return NextResponse.json(
        { error: "Only organization owners can view export history" },
        { status: 403 }
      );
    }

    const exports = await prismadb.dataExport.findMany({
      where: {
        organizationId: user.organization.id,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // Check if can request new export
    const lastExport = exports[0];
    const canRequestNew = !lastExport ||
      Date.now() - lastExport.createdAt.getTime() >= RATE_LIMIT_MS;

    let nextAvailableAt = null;
    if (!canRequestNew && lastExport) {
      nextAvailableAt = new Date(
        lastExport.createdAt.getTime() + RATE_LIMIT_MS
      ).toISOString();
    }

    return NextResponse.json({
      canRequestNew,
      nextAvailableAt,
      exports: exports.map((exp) => ({
        id: exp.id,
        status: exp.status,
        createdAt: exp.createdAt,
        completedAt: exp.completedAt,
        requestedBy: exp.user,
      })),
    });
  } catch (error) {
    console.error("Export history error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
