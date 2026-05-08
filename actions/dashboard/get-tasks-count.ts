"use server";
import { prismadb } from "@/lib/prisma";
import { requireAuthenticated, AuthenticationError } from "@/lib/authz";

export const getTasksCount = async () => {
  try {
    const user = await requireAuthenticated();
    if (user.role === "admin" || user.role === "manager") {
      return await prismadb.tasks.count();
    }
    return await prismadb.tasks.count({ where: { user: user.id } });
  } catch (e) {
    if (e instanceof AuthenticationError) return 0;
    throw e;
  }
};

export const getUsersTasksCount = async (userId: string) => {
  await requireAuthenticated();
  const data = await prismadb.tasks.count({
    where: {
      user: userId,
    },
  });
  return data;
};
