import { prismadb } from "@/lib/prisma";

/**
 * Fetch task comments shared by Projects and CRM modules.
 *
 * The `tasksComments` table stores comments for both Projects tasks
 * (`Tasks` model, linked via the `task` FK) and CRM account tasks
 * (`crm_Accounts_Tasks` model, linked via the `assigned_crm_account_task`
 * FK). A caller supplies a single taskId; task ids are UUIDs so there is
 * no ambiguity between the two FK columns. Matching either column returns
 * the right comments for whichever task type the id belongs to.
 */
export const getTaskComments = async (taskId: string) => {
  const data = await prismadb.tasksComments.findMany({
    where: {
      OR: [{ task: taskId }, { assigned_crm_account_task: taskId }],
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
