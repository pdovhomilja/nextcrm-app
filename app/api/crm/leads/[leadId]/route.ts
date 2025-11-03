import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prismadb } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { withRateLimit } from "@/middleware/with-rate-limit";

async function handleDELETE(req: NextRequest, props: { params: Promise<{ leadId: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  if (!session.user.organizationId) {
    return new NextResponse("User organization not found", { status: 401 });
  }

  if (!params.leadId) {
    return new NextResponse("Lead ID is required", { status: 400 });
  }

  try {
    // Verify the lead belongs to the user's organization
    const existingLead = await prismadb.crm_Leads.findFirst({
      where: {
        id: params.leadId,
        organizationId: session.user.organizationId,
      },
    });

    if (!existingLead) {
      return new NextResponse("Lead not found or unauthorized", { status: 404 });
    }

    await prismadb.crm_Leads.delete({
      where: {
        id: params.leadId,
      },
    });

    return NextResponse.json({ message: "Lead deleted" }, { status: 200 });
  } catch (error) {
    console.log("[LEAD_DELETE]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}

// Apply rate limiting to all endpoints
export const DELETE = withRateLimit(handleDELETE);
