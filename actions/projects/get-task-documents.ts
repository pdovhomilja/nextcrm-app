import { prismadb } from "@/lib/prisma";

export const getTaskDocuments = async (taskId: string) => {
  const data = await prismadb.documents.findMany({
    where: {
      tasks: {
        some: {
          taskId: taskId,
        },
      },
    },
    include: {
      created_by_user_relation: {
        select: {
          name: true,
        },
      },
      assigned_to_user_relation: {
        select: {
          name: true,
        },
      },
    },
  });
  /*   const data = await prismadb.tasks.findMany({
    where: {
      documents: {
        some: {
          id: taskId,
        },
      },
    },
  }); */
  return data;
};
