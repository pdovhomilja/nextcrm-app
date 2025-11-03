"use server";

import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface AcceptInvitationResult {
  success: boolean;
  message: string;
  organizationId?: string;
}

/**
 * Accept an invitation token and join the organization
 */
export const acceptInvitation = async (
  token: string
): Promise<AcceptInvitationResult> => {
  try {
    if (!token) {
      return {
        success: false,
        message: "Invalid invitation token",
      };
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return {
        success: false,
        message: "Please sign in to accept the invitation",
      };
    }

    // Find the invitation
    const invitation = await prismadb.organizationInvitations.findUnique({
      where: { token },
      include: { organization: true },
    });

    if (!invitation) {
      return {
        success: false,
        message: "Invitation not found or has been revoked",
      };
    }

    // Check if invitation is pending
    if (invitation.status !== "PENDING") {
      return {
        success: false,
        message: `Invitation has already been ${invitation.status.toLowerCase()}`,
      };
    }

    // Check if invitation has expired
    if (new Date() > invitation.expiresAt) {
      // Mark as expired
      await prismadb.organizationInvitations.update({
        where: { id: invitation.id },
        data: { status: "EXPIRED" },
      });

      return {
        success: false,
        message: "Invitation has expired",
      };
    }

    // Check if email matches
    if (invitation.email !== session.user.email) {
      return {
        success: false,
        message: "This invitation is for a different email address",
      };
    }

    // Get the user
    const user = await prismadb.users.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return {
        success: false,
        message: "User not found",
      };
    }

    // Check if user is already a member
    if (user.organizationId === invitation.organizationId) {
      return {
        success: false,
        message: "You are already a member of this organization",
      };
    }

    // If user belongs to another organization, we should handle that
    // For now, we'll update their organization
    if (user.organizationId) {
      // Optionally: could prevent users from switching organizations
      // return {
      //   success: false,
      //   message: "You are already a member of another organization",
      // };
    }

    // Update user to join organization
    await prismadb.users.update({
      where: { id: user.id },
      data: {
        organizationId: invitation.organizationId,
        organization_role: invitation.role,
      },
    });

    // Mark invitation as accepted
    await prismadb.organizationInvitations.update({
      where: { id: invitation.id },
      data: { status: "ACCEPTED" },
    });

    return {
      success: true,
      message: `Successfully joined ${invitation.organization.name}`,
      organizationId: invitation.organizationId,
    };
  } catch (error: any) {
    console.error("[ACCEPT_INVITATION]", error);
    return {
      success: false,
      message: error.message || "Failed to accept invitation",
    };
  }
};
