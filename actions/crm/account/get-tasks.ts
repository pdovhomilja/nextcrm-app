import { prismadb } from "@/lib/prisma";

export const getAccountsTasks = async (accountId: string) => {
  const data = await prismadb.crm_Accounts_Tasks.findMany({
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
