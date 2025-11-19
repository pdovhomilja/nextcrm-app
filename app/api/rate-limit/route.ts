/**
 * Rate Limit Status API
 * Provides current rate limit information for the user's organization
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRateLimitStatus } from "@/lib/rate-limit";
import { formatRateLimitInfo, getRateLimitIdentifier } from "@/lib/rate-limit-config";
import { prismadb } from "@/lib/prisma";
import { OrganizationPlan } from "@prisma/client";

async function handleGET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }

    const organizationId = session.user.organizationId;

    if (!organizationId) {
      return NextResponse.json({
        limit: 100,
        remaining: 100,
        resetIn: "1 hour",
        percentUsed: 0,
      });
    }

    // Get organization plan
    const organization = await prismadb.organizations.findUnique({
      where: { id: organizationId },
      select: { plan: true },
    });

    const plan: OrganizationPlan = organization?.plan || "FREE";

    // Get identifier for rate limiting
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null;
    const identifier = getRateLimitIdentifier(organizationId, ipAddress, false);

    // Get current rate limit status without incrementing
    const status = getRateLimitStatus(identifier, plan);

    // Format for display
    const formatted = formatRateLimitInfo(
      status.limit,
      status.remaining,
      status.resetTime
    );

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("[RATE_LIMIT_STATUS]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

// Export without rate limiting (this endpoint itself should not be rate limited)
export { handleGET as GET };
