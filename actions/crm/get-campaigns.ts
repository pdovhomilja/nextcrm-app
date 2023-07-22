import { prismadb } from "@/lib/prisma";

export const getCampaigns = async () => {
  const data = await prismadb.crm_campains.findMany({});
  return data;
};
