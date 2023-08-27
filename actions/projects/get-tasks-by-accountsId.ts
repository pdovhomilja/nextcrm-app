import { prismadb } from "@/lib/prisma";

export const getTasksByAcccountId = async (accountId: string) => {
  const data = await prismadb.tasks.findMany({
    where: {
      account: accountId,
    },
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
