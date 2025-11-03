import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * GET /api/organization/members
 * Get all members of the organization
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }

    const user = await prismadb.users.findUnique({
      where: { email: session.user.email },
      include: { organization: true },
    });

    if (!user?.organizationId) {
      return new NextResponse("User does not belong to an organization", {
        status: 400,
      });
    }

    const members = await prismadb.users.findMany({
      where: {
        organizationId: user.organizationId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        organization_role: true,
        created_on: true,
      },
      orderBy: { created_on: "desc" },
    });

    return NextResponse.json(members);
  } catch (error) {
    console.log("[MEMBERS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
