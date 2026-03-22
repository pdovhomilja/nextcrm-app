import { prismadb } from "@/lib/prisma";

export const getUserLeads = async (userId: string) => {
  const data = await prismadb.crm_Leads.findMany({
    where: {
      assigned_to: userId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  return data;
};
