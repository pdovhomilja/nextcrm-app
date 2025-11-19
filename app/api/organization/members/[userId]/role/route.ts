import { NextRequest, NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canManageRoles, ASSIGNABLE_ROLES } from "@/lib/permissions";
import { OrganizationRole } from "@prisma/client";
import { withRateLimit } from "@/middleware/with-rate-limit";

/**
 * PUT /api/organization/members/[userId]/role
 * Update a member's role (owner only)
 */
async function handlePUT(req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }

    const body = await req.json();
    const { role } = body;

    if (!role) {
      return new NextResponse("Role is required", { status: 400 });
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

    // Check permission - only owner can manage roles
    if (!canManageRoles(user.organization_role)) {
      return new NextResponse("Only owners can manage roles", { status: 403 });
    }

    // Validate role
    if (!ASSIGNABLE_ROLES.includes(role)) {
      return new NextResponse("Invalid role", { status: 400 });
    }

    // Prevent changing owner role
    if (userId === user.organization?.ownerId) {
      return new NextResponse("Cannot change the owner's role", { status: 400 });
    }

    // Get the member to update
    const memberToUpdate = await prismadb.users.findUnique({
      where: { id: userId },
    });

    if (!memberToUpdate) {
      return new NextResponse("Member not found", { status: 404 });
    }

    // Check if member belongs to the same organization
    if (memberToUpdate.organizationId !== user.organizationId) {
      return new NextResponse("Member does not belong to your organization", {
        status: 403,
      });
    }

    // Update the member's role
    const updatedMember = await prismadb.users.update({
      where: { id: userId },
      data: {
        organization_role: role as OrganizationRole,
      },
      select: {
        id: true,
        name: true,
        email: true,
        organization_role: true,
      },
    });

    return NextResponse.json(updatedMember);
  } catch (error) {
    console.log("[MEMBER_ROLE_PUT]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

// Apply rate limiting to all endpoints
export const PUT = withRateLimit(handlePUT);
