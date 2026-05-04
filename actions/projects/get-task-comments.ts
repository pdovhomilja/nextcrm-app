import { prismadb } from "@/lib/prisma";
import {
  requireAuthenticated,
  assertCanReadTask,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

/**
 * Fetch comments for a Projects task (`Tasks` model).
 *
 * Projects-module only. CRM account tasks have their own comments loaded
 * via the `comments` relation on `crm_Accounts_Tasks` — do not route them
 * through this function.
 */
export const getTaskComments = async (taskId: string) => {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return [];
    throw e;
  }

  try {
    await assertCanReadTask(user, taskId);
  } catch (e) {
    if (e instanceof AuthorizationError) return [];
    throw e;
  }

  const data = await prismadb.tasksComments.findMany({
    where: {
      task: taskId,
    },
    include: {
      assigned_user: {
        select: {
          name: true,
          avatar: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  return data;
};
