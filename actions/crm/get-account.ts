import { prismadb } from "@/lib/prisma";

export const getAccount = async (accountId: string) => {
  const data = await prismadb.crm_Accounts.findFirst({
    where: {
      id: accountId,
    },
  });
  return data;
};
