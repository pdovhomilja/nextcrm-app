import { prismadb } from "@/lib/prisma";

export const getContacts = async () => {
  const data = await prismadb.crm_Contacts.findMany({
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
