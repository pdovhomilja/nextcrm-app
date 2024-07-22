import { prismadb } from "@/lib/prisma";

export const getCrMTask = async (taskId: string) => {
  const data = await prismadb.crm_Accounts_Tasks.findFirst({
    where: {
      id: taskId,
    },
    include: {
      assigned_user: {
        select: {
          id: true,
          name: true,
        },
      },
      comments: {
        select: {
          id: true,
          comment: true,
          createdAt: true,
          assigned_user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
      },
    },
  });
  return data;
};
