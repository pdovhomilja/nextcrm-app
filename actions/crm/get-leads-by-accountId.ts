import { prismadb } from "@/lib/prisma";

export const getLeadsByAccountId = async (accountId: string) => {
  const data = await prismadb.crm_Leads.findMany({
    where: {
      accountsIDs: accountId,
    },
    include: {
      assigned_to_user: {
        select: {
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
