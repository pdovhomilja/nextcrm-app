"use server";

import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  status: string;
  invitedBy: {
    name: string | null;
    email: string;
  };
  createdAt: Date;
  expiresAt: Date;
}

/**
 * Get all pending invitations for the user's organization
 */
export const getInvitations = async (): Promise<PendingInvitation[]> => {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      throw new Error("Unauthenticated");
    }

    const user = await prismadb.users.findUnique({
      where: { email: session.user.email },
    });

    if (!user?.organizationId) {
      throw new Error("User does not belong to an organization");
    }

    const invitations = await prismadb.organizationInvitations.findMany({
      where: {
        organizationId: user.organizationId,
        status: "PENDING",
      },
      include: {
        invitedByUser: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return invitations.map((inv) => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      status: inv.status,
      invitedBy: {
        name: inv.invitedByUser.name,
        email: inv.invitedByUser.email,
      },
      createdAt: inv.createdAt,
      expiresAt: inv.expiresAt,
    }));
  } catch (error) {
    console.error("Error getting invitations:", error);
    return [];
  }
};
