import { prismadb } from "@/lib/prisma";

export const getUserOpportunities = async (userId: string) => {
  const data = await prismadb.crm_Opportunities.findMany({
    where: {
      assigned_to: userId,
      deletedAt: null,
    },
    include: {
      assigned_sales_stage: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  return data;
};
