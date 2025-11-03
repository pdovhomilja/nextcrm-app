"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";

export const getBoards = async (userId: string) => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.organizationId) {
    throw new Error("Unauthorized: No organization context");
  }

  if (!userId) {
    return null;
  }

  const data = await prismadb.boards.findMany({
    where: {
      organizationId: session.user.organizationId,
      OR: [
        {
          user: userId,
        },
        {
          visibility: "public",
        },
      ],
    },
    include: {
      assigned_user: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
  return data;
};
