import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

//Route to unlink contact from opportunity
export async function PUT(req: Request, props: { params: Promise<{ contactId: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  if (!params.contactId) {
    return new NextResponse("contact ID is required", { status: 400 });
  }

  const body = await req.json();

  const { opportunityId } = body;

  console.log(params.contactId, "contactId");
  console.log(opportunityId, "opportunityId");

  if (!opportunityId) {
    return new NextResponse("opportunity ID is required", { status: 400 });
  }

  try {
    // Delete the junction table entry using composite primary key
    await prismadb.contactsToOpportunities.delete({
      where: {
        contact_id_opportunity_id: {
          contact_id: params.contactId,
          opportunity_id: opportunityId,
        },
      },
    });
  } catch (error) {
    console.log(error);
    return new NextResponse(
      "[CONTACTS - UNLINK - PUT] - Error, somethings went wrong",
      { status: 500 }
    );
  }
  return NextResponse.json("Contact unlinked from opportunity", { status: 200 });
}
