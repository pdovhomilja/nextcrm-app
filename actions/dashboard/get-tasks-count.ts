"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";

export const getTasksCount = async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.organizationId) {
    throw new Error("Unauthorized: No organization context");
  }

  const data = await prismadb.tasks.count({
    where: {
      organizationId: session.user.organizationId,
    },
  });
  return data;
};

export const getUsersTasksCount = async (userId: string) => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.organizationId) {
    throw new Error("Unauthorized: No organization context");
  }

  const data = await prismadb.tasks.count({
    where: {
      user: userId,
      organizationId: session.user.organizationId,
    },
  });
  return data;
};
