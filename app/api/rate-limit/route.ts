/**
 * Rate Limit Status API
 * Check current rate limit status for organization
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { getRateLimitStatus } from "@/lib/rate-limit";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's organization
    const user = await prismadb.users.findUnique({
      where: { id: session.user.id },
      include: {
        organization: {
          select: {
            id: true,
            plan: true,
            name: true,
          },
        },
      },
    });

    if (!user || !user.organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Get rate limit status
    const status = getRateLimitStatus(user.organization.id, user.organization.plan);

    return NextResponse.json({
      organizationId: user.organization.id,
      organizationName: user.organization.name,
      plan: user.organization.plan,
      rateLimit: {
        limit: status.limit,
        used: status.used,
        remaining: status.remaining,
        resetTime: new Date(status.resetTime).toISOString(),
        resetIn: Math.ceil((status.resetTime - Date.now()) / 1000), // seconds
      },
    });
  } catch (error) {
    console.error("Rate limit status error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
