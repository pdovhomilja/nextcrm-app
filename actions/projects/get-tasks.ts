import { prismadb } from "@/lib/prisma";

export const getTasks = async () => {
  const data = await prismadb.tasks.findMany({
    include: {
      assigned_user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
  return data;
};
