import { prismadb } from "@/lib/prisma";

export const getAccounts = async () => {
  const data = await prismadb.crm_Accounts.findMany({
    include: {
      assigned_to_user: {
        select: {
          name: true,
        },
      },
      contacts: {
        select: {
          first_name: true,
          last_name: true,
        },
      },
    },
    orderBy: {
      date_created: "desc",
    },
  });
  return data;
};
