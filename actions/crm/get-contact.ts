import { prismadb } from "@/lib/prisma";

export const getContact = async (contactId: string) => {
  const data = await prismadb.crm_Contacts.findFirst({
    where: {
      id: contactId,
    },
    include: {
      assigned_accounts: true,
      assigned_opportunities: true,
      assigned_documents: true,
    },
  });
  return data;
};
