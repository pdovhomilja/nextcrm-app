import { prismadb } from "@/lib/prisma";

export const getCampaignsCount = async () => {
  const data = await prismadb.crm_campaigns.count();
  return data;
};
