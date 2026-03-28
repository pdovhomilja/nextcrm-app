import { prismadb } from "@/lib/prisma";

export const getLeadsCount = async () => {
  const data = await prismadb.crm_Leads.count({ where: { deletedAt: null } });
  return data;
};
