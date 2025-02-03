import { prismadb } from "@/lib/prisma";

export const getContact = async (contactId: string) => {
  const data = await prismadb.crm_Contacts.findFirst({
    where: {
      id: contactId,
    },
    include: {
      opportunities: true,
      documents: true,
      assigned_accounts: true,
    },
  });
  return data;
};
