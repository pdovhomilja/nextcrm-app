import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canManageMembers } from "@/lib/permissions";

/**
 * DELETE /api/organization/members/[userId]
 * Remove a member from the organization
 */
export async function DELETE(
  req: Request,
  { params }: { params: { userId: string } }
) {
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

    // Check permission
    if (!canManageMembers(user.organization_role)) {
      return new NextResponse("Insufficient permissions", { status: 403 });
    }

    // Prevent removing yourself
    if (user.id === params.userId) {
      return new NextResponse(
        "You cannot remove yourself from the organization",
        { status: 400 }
      );
    }

    // Get the member to remove
    const memberToRemove = await prismadb.users.findUnique({
      where: { id: params.userId },
    });

    if (!memberToRemove) {
      return new NextResponse("Member not found", { status: 404 });
    }

    // Check if member belongs to the same organization
    if (memberToRemove.organizationId !== user.organizationId) {
      return new NextResponse("Member does not belong to your organization", {
        status: 403,
      });
    }

    // Prevent removing the owner (unless you are the owner)
    const organization = await prismadb.organizations.findUnique({
      where: { id: user.organizationId },
    });

    if (
      organization?.ownerId === params.userId &&
      user.id !== params.userId
    ) {
      return new NextResponse("Cannot remove the organization owner", {
        status: 400,
      });
    }

    // Remove the member
    await prismadb.users.update({
      where: { id: params.userId },
      data: {
        organizationId: null,
        organization_role: "MEMBER", // Reset to default
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.log("[MEMBER_DELETE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
