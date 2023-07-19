import { prismadb } from "@/lib/prisma";

export const getIndustries = async () => {
  const data = await prismadb.setupIndustry.findMany({});
  return data;
};
