import { prismadb } from "@/lib/prisma";

export const getAccount = async (accountId: string) => {
  const data = await prismadb.crm_Accounts.findMany({
    where: {
      id: accountId,
    },
  });
  return data;
};
