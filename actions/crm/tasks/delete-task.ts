"use server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  requireAuthenticated,
  assertCanWriteCrmTask,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export const deleteTask = async (taskId: string) => {
  if (!taskId) return { error: "taskId is required" };

  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    throw e;
  }
  try {
    await assertCanWriteCrmTask(user, taskId);
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }

  try {
    // CRM account task comments link via `assigned_crm_account_task`, not
    // the Projects-facing `task` FK — see actions/crm/tasks/add-comment.ts.
    await prismadb.tasksComments.deleteMany({
      where: { assigned_crm_account_task: taskId },
    });

    await prismadb.documentsToCrmAccountsTasks.deleteMany({
      where: { crm_accounts_task_id: taskId },
    });

    await prismadb.crm_Accounts_Tasks.delete({
      where: { id: taskId },
    });

    revalidatePath("/[locale]/(routes)/crm", "page");
    return { success: true };
  } catch (error) {
    console.log("[DELETE_TASK]", error);
    return { error: "Failed to delete task" };
  }
};
