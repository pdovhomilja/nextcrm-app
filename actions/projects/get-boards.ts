import { prismadb } from "@/lib/prisma";

export const getBoards = async () => {
  const data = await prismadb.boards.findMany({
    include: {
      assigned_user: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      date_created: "desc",
    },
  });
  return data;
};
