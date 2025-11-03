import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prismadb } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

//Contact delete route
export async function DELETE(req: Request, props: { params: Promise<{ contactId: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  if (!session.user.organizationId) {
    return new NextResponse("User organization not found", { status: 401 });
  }

  if (!params.contactId) {
    return new NextResponse("contact ID is required", { status: 400 });
  }

  try {
    // Verify the contact belongs to the user's organization
    const existingContact = await prismadb.crm_Contacts.findFirst({
      where: {
        id: params.contactId,
        organizationId: session.user.organizationId,
      },
    });

    if (!existingContact) {
      return new NextResponse("Contact not found or unauthorized", {
        status: 404,
      });
    }

    await prismadb.crm_Contacts.delete({
      where: {
        id: params.contactId,
      },
    });

    return NextResponse.json({ message: "Contact deleted" }, { status: 200 });
  } catch (error) {
    console.log("[CONTACT_DELETE]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}
