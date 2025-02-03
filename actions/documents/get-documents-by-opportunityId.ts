import { prismadb } from "@/lib/prisma";

export const getDocumentsByOpportunityId = async (opportunityId: string) => {
  const data = await prismadb.documents.findMany({
    where: {
      opportunities: {
        some: {
          opportunityId: opportunityId,
        },
      },
    },
    include: {
      created_by_user_relation: {
        select: {
          name: true,
        },
      },
      assigned_to_user_relation: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      date_created: "desc",
    },
  });
  return data;
};
