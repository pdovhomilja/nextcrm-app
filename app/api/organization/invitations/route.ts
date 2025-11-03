import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canManageMembers } from "@/lib/permissions";

/**
 * GET /api/organization/invitations
 * Get all pending invitations for the organization
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

    // Check permission
    if (!canManageMembers(user.organization_role)) {
      return new NextResponse("Insufficient permissions", { status: 403 });
    }

    const invitations = await prismadb.organizationInvitations.findMany({
      where: {
        organizationId: user.organizationId,
        status: "PENDING",
      },
      include: {
        invitedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(invitations);
  } catch (error) {
    console.log("[INVITATIONS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

/**
 * DELETE /api/organization/invitations
 * Cancel a pending invitation (bulk delete)
 */
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }

    const body = await req.json();
    const { invitationId } = body;

    if (!invitationId) {
      return new NextResponse("Invitation ID is required", { status: 400 });
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

    // Check if invitation exists and belongs to user's organization
    const invitation = await prismadb.organizationInvitations.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      return new NextResponse("Invitation not found", { status: 404 });
    }

    if (invitation.organizationId !== user.organizationId) {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    // Cancel invitation
    await prismadb.organizationInvitations.update({
      where: { id: invitationId },
      data: { status: "CANCELLED" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.log("[INVITATIONS_DELETE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
