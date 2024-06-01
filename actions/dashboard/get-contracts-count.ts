import { prismadb } from "@/lib/prisma";

export const getContractsCount = async () => {
  const data = await prismadb.crm_Contracts.count();
  return data;
};
