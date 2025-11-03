import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { rateLimited } from "@/middleware/with-rate-limit";
import { logAuditEvent } from "@/lib/audit-logger";

async function handlePOST(req: NextRequest) {
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
          resourceId: "portal-session",
          changes: {
            method: "POST",
            endpoint: "/api/billing/create-portal-session",
            requiredRole: "OWNER",
            actualRole: session.user.organization_role,
            severity: "warning",
            reason: "Unauthorized billing portal access attempt",
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
          message: "Only organization owners can access the billing portal",
          code: "OWNER_ONLY",
          requiredRole: "OWNER",
        },
        { status: 403 }
      );
    }

    const user = await prismadb.users.findUnique({
      where: { email: session.user.email },
      include: {
        organization: true,
      },
    });

    if (!user || !user.organizationId || !user.organization) {
      return new NextResponse("User not associated with an organization", { status: 400 });
    }

    const organization = user.organization;

    if (!organization.stripeCustomerId) {
      return new NextResponse("No Stripe customer found for this organization", { status: 400 });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: organization.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error("[PORTAL_SESSION_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

// Apply rate limiting to all endpoints
export const POST = rateLimited(handlePOST);
