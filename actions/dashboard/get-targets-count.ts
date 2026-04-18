import { prismadb } from "@/lib/prisma";

export const getTargetsCount = async () => {
  const data = await prismadb.crm_Targets.count();
  return data;
};
