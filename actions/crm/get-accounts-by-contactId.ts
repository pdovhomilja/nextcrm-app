import { prismadb } from "@/lib/prisma";

export const getAccountsByContactId = async (contactId: string) => {
  const data = await prismadb.crm_Accounts.findMany({
    where: {
      contacts: {
        some: {
          id: contactId,
        },
      },
    },
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
      createdAt: "desc",
    },
  });
  return data;
};
