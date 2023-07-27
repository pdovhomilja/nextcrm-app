import { prismadb } from "@/lib/prisma";

export const getIndustries = async () => {
  const data = await prismadb.crm_Industry_Type.findMany({});
  return data;
};
