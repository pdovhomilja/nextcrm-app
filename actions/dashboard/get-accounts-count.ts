import { prismadb } from "@/lib/prisma";

export const getAccountsCount = async () => {
  const data = await prismadb.crm_Accounts.count({ where: { deletedAt: null } });
  return data;
};
