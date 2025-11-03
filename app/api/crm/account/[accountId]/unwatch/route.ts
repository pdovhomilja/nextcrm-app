import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(req: Request, props: { params: Promise<{ accountId: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  if (!session.user.organizationId) {
    return NextResponse.json({ error: "User organization not found" }, { status: 401 });
  }

  if (!params.accountId) {
    return new NextResponse("Missing account ID", { status: 400 });
  }

  const accountId = params.accountId;

  try {
    // Verify the account belongs to the user's organization
    const existingAccount = await prismadb.crm_Accounts.findFirst({
      where: {
        id: accountId,
        organizationId: session.user.organizationId,
      },
    });

    if (!existingAccount) {
      return NextResponse.json({ error: "Account not found or unauthorized" }, { status: 404 });
    }

    await prismadb.crm_Accounts.update({
      where: {
        id: accountId,
      },
      data: {
        watching_users: {
          disconnect: {
            id: session.user.id,
          },
        },
      },
    });
    return NextResponse.json({ message: "Board watched" }, { status: 200 });
  } catch (error) {
    console.log(error);
  }
}
