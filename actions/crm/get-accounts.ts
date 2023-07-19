import { prismadb } from "@/lib/prisma";

export const getAccounts = async () => {
  const data = await prismadb.crm_Accounts.findMany({
    orderBy: {
      date_created: "desc",
    },
  });
  return data;
};
