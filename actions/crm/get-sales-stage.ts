import { prismadb } from "@/lib/prisma";

export const getSaleStages = async () => {
  const data = await prismadb.crm_Opportunities_Sales_Stages.findMany({
    orderBy: {
      probability: "asc",
    },
  });
  return data;
};
