import { prismadb } from "@/lib/prisma";

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
