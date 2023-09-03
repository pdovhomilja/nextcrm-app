import { prismadb } from "@/lib/prisma";
/*
This function is used for CRM tasks and Projects tasks. CRM Tasks (crm_Acccount_Tasks) models are different then Project Tasks (Tasks) but use the same comments model!.
*/

export const getTaskComments = async (taskId: string) => {
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
