import { prismadb } from "@/lib/prisma";
import {
  requireAuthenticated,
  AuthenticationError,
  isUnhandledRole,
} from "@/lib/authz";

export const getUserTasks = async (userId: string) => {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return [];
    throw e;
  }

  // user role: only allowed to read own tasks.
  if (user.role === "user" && userId !== user.id) {
    return [];
  }
  // Any role without rules here (partner) gets nothing.
  if (isUnhandledRole(user)) return [];

  const data = await prismadb.tasks.findMany({
    where: {
      user: userId,
    },
    include: {
      assigned_user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return data;
};
