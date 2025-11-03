import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prismadb } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function PUT(req: Request, props: { params: Promise<{ opportunityId: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  if (!session.user.organizationId) {
    return new NextResponse("User organization not found", { status: 401 });
  }

  if (!params.opportunityId) {
    return new NextResponse("Opportunity ID is required", { status: 400 });
  }

  const body = await req.json();

  const { destination } = body;

  try {
    // Verify the opportunity belongs to the user's organization
    const existingOpportunity = await prismadb.crm_Opportunities.findFirst({
      where: {
        id: params.opportunityId,
        organizationId: session.user.organizationId,
      },
    });

    if (!existingOpportunity) {
      return new NextResponse("Opportunity not found or unauthorized", {
        status: 404,
      });
    }

    await prismadb.crm_Opportunities.update({
      where: {
        id: params.opportunityId,
      },
      data: {
        sales_stage: destination,
      },
    });

    const data = await prismadb.crm_Opportunities.findMany({
      where: {
        organizationId: session.user.organizationId,
      },
      include: {
        assigned_to_user: {
          select: {
            avatar: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(
      { message: "Opportunity updated", data },

      { status: 200 }
    );
  } catch (error) {
    console.log("[OPPORTUNITY_UPDATE]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ opportunityId: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  if (!session.user.organizationId) {
    return new NextResponse("User organization not found", { status: 401 });
  }

  if (!params.opportunityId) {
    return new NextResponse("Opportunity ID is required", { status: 400 });
  }

  try {
    // Verify the opportunity belongs to the user's organization
    const existingOpportunity = await prismadb.crm_Opportunities.findFirst({
      where: {
        id: params.opportunityId,
        organizationId: session.user.organizationId,
      },
    });

    if (!existingOpportunity) {
      return new NextResponse("Opportunity not found or unauthorized", {
        status: 404,
      });
    }

    await prismadb.crm_Opportunities.delete({
      where: {
        id: params.opportunityId,
      },
    });

    return NextResponse.json(
      { message: "Opportunity deleted" },
      { status: 200 }
    );
  } catch (error) {
    console.log("[OPPORTUNITY_DELETE]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}
