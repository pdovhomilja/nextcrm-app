import { prismadb } from "@/lib/prisma";

export const getContactsByAccountId = async (accountId: string) => {
  const data = await prismadb.crm_Contacts.findMany({
    where: {
      accountsIDs: accountId,
    },
    include: {
      assigned_to_user: {
        select: {
          name: true,
        },
      },
      crate_by_user: {
        select: {
          name: true,
        },
      },
      assigned_accounts: true,
    },
  });
  return data;
};
