"use server";

import { prismadb } from "@/lib/prisma";
import { getServerSession, Session } from "next-auth";
import { authOptions } from "@/lib/auth";

export const getOrganization = async () => {
  const session: Session | null = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return null;
  }

  const user = await prismadb.users.findUnique({
    where: {
      email: session?.user?.email,
    },
  });

  if (!user || !user.organizationId) {
    return null;
  }

  try {
    const organization = await prismadb.organizations.findUnique({
      where: {
        id: user.organizationId,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return organization;
  } catch (error) {
    console.log("Error getting organization:", error);
    return null;
  }
};
