import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { rateLimited } from "@/middleware/with-rate-limit";
import { logAuditEvent } from "@/lib/audit-logger";

async function handleGET(req?: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }

    // CRITICAL: Check if user is OWNER
    if (session.user.organization_role !== "OWNER") {
      // Log permission denial
      try {
        await logAuditEvent({
          action: "PERMISSION_DENIED",
          resource: "billing",
          resourceId: "subscription",
          changes: {
            method: "GET",
            endpoint: "/api/billing/subscription",
            requiredRole: "OWNER",
            actualRole: session.user.organization_role,
            severity: "warning",
            reason: "Unauthorized billing subscription access attempt",
          },
          context: {
            userId: session.user.id,
            organizationId: session.user.organizationId || "unknown",
          },
        });
      } catch (auditError) {
        console.error("[AUDIT_LOG_ERROR]", auditError);
      }

      return NextResponse.json(
        {
          error: "Forbidden",
          message: "Only organization owners can view billing subscriptions",
          code: "OWNER_ONLY",
          requiredRole: "OWNER",
        },
        { status: 403 }
      );
    }

    const user = await prismadb.users.findUnique({
      where: { email: session.user.email },
      include: {
        organization: {
          include: {
            subscriptions: {
              where: {
                status: {
                  in: ["ACTIVE", "TRIALING", "PAST_DUE"],
                },
              },
              orderBy: {
                createdAt: "desc",
              },
              take: 1,
            },
            paymentHistory: {
              orderBy: {
                createdAt: "desc",
              },
              take: 10,
            },
          },
        },
      },
    });

    if (!user || !user.organizationId || !user.organization) {
      return new NextResponse("User not associated with an organization", { status: 400 });
    }

    const organization = user.organization;
    const currentSubscription = organization.subscriptions[0] || null;

    return NextResponse.json({
      organization: {
        id: organization.id,
        name: organization.name,
        plan: organization.plan,
        status: organization.status,
        stripeCustomerId: organization.stripeCustomerId,
      },
      subscription: currentSubscription,
      paymentHistory: organization.paymentHistory,
    });
  } catch (error) {
    console.error("[SUBSCRIPTION_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

// Apply rate limiting to all endpoints
export const GET = rateLimited(handleGET);
