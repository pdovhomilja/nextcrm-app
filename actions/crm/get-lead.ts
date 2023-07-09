import { prismadb } from "@/lib/prisma";

export const getLead = async (leadId: string) => {
  const data = await prismadb.crm_Leads.findMany({
    where: {
      id: leadId,
    },
  });
  return data;
};
