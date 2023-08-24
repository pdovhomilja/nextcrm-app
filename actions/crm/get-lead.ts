import { prismadb } from "@/lib/prisma";

export const getLead = async (leadId: string) => {
  const data = await prismadb.crm_Leads.findFirst({
    where: {
      id: leadId,
    },
    include: {
      assigned_to_user: {
        select: {
          id: true,
          name: true,
        },
      },
      assigned_accounts: true,
      assigned_documents: true,
    },
  });
  return data;
};
