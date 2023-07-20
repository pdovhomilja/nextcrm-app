import { prismadb } from "@/lib/prisma";

export const getUserTasks = async (userId: string) => {
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
