"use server";

import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ASSIGNABLE_ROLES, canManageMembers } from "@/lib/permissions";
import { z } from "zod";
import { createSafeAction } from "@/lib/create-safe-action";
import crypto from "crypto";
import { renderAsync } from "@react-email/components";
import { OrganizationInvitationEmail } from "@/emails/OrganizationInvitation";
import sendEmail from "@/lib/sendmail";

const InviteMemberSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]),
});

type InviteMemberInput = z.infer<typeof InviteMemberSchema>;

interface InviteMemberOutput {
  success: boolean;
  message: string;
  invitationId?: string;
}

async function handler(
  data: InviteMemberInput
): Promise<{
  fieldErrors?: Record<string, string[]>;
  error?: string | null;
  data?: InviteMemberOutput;
}> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return { error: "Unauthenticated" };
    }

    const user = await prismadb.users.findUnique({
      where: { email: session.user.email },
      include: { organization: true },
    });

    if (!user?.organizationId) {
      return { error: "User does not belong to an organization" };
    }

    // Check if user has permission to invite members
    if (!canManageMembers(user.organization_role)) {
      return { error: "You do not have permission to invite members" };
    }

    // Check if user is trying to invite themselves
    if (data.email === user.email) {
      return { error: "You cannot invite yourself" };
    }

    // Check if email is already a member
    const existingMember = await prismadb.users.findUnique({
      where: { email: data.email },
    });

    if (existingMember?.organizationId === user.organizationId) {
      return { error: "This user is already a member of your organization" };
    }

    // Check if invitation already exists and is pending
    const existingInvitation = await prismadb.organizationInvitations.findFirst({
      where: {
        organizationId: user.organizationId,
        email: data.email,
        status: "PENDING",
      },
    });

    if (existingInvitation) {
      return { error: "An invitation already exists for this email address" };
    }

    // Check if role is assignable
    if (!ASSIGNABLE_ROLES.includes(data.role as any)) {
      return { error: "Invalid role selected" };
    }

    // Generate invitation token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    // Create invitation
    const invitation = await prismadb.organizationInvitations.create({
      data: {
        organizationId: user.organizationId,
        email: data.email,
        role: data.role,
        token,
        status: "PENDING",
        invitedBy: user.id,
        expiresAt,
      },
    });

    // Get organization details
    const organization = await prismadb.organizations.findUnique({
      where: { id: user.organizationId },
    });

    if (!organization) {
      return { error: "Organization not found" };
    }

    // Send invitation email
    const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/accept-invitation/${token}`;

    try {
      const emailHtml = await renderAsync(
        OrganizationInvitationEmail({
          organizationName: organization.name,
          invitedByName: user.name || user.email,
          inviteeEmail: data.email,
          role: data.role,
          invitationLink,
          userLanguage: user.userLanguage,
        })
      );

      await sendEmail({
        from: process.env.EMAIL_FROM,
        to: data.email,
        subject: `You're invited to ${organization.name}`,
        html: emailHtml,
        text: `You've been invited to join ${organization.name}. Visit ${invitationLink} to accept.`,
      });
    } catch (emailError) {
      console.error("Error sending invitation email:", emailError);
      // Don't fail the invitation creation if email fails, but log it
    }

    return {
      data: {
        success: true,
        message: `Invitation sent to ${data.email}`,
        invitationId: invitation.id,
      },
    };
  } catch (error: any) {
    console.error("[INVITE_MEMBER]", error);
    return { error: error.message || "Failed to send invitation" };
  }
}

export const inviteMember = createSafeAction(InviteMemberSchema, handler);
