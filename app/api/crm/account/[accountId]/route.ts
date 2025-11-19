import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prismadb } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { withRateLimit } from "@/middleware/with-rate-limit";

async function handleDELETE(req: NextRequest, props: { params: Promise<{ accountId: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  if (!session.user.organizationId) {
    return new NextResponse("User organization not found", { status: 401 });
  }

  try {
    // Verify the account belongs to the user's organization
    const existingAccount = await prismadb.crm_Accounts.findFirst({
      where: {
        id: params.accountId,
        organizationId: session.user.organizationId,
      },
    });

    if (!existingAccount) {
      return new NextResponse("Account not found or unauthorized", {
        status: 404,
      });
    }

    await prismadb.crm_Accounts.delete({
      where: {
        id: params.accountId,
      },
    });

    return NextResponse.json({ message: "Account deleted" }, { status: 200 });
  } catch (error) {
    console.log("[ACCOUNT_DELETE]", error);
    return new NextResponse("Initial error", { status: 500 });
  }
}

// Apply rate limiting to all endpoints
export const DELETE = withRateLimit(handleDELETE);
