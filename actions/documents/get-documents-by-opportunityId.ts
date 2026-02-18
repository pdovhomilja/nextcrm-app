import { prismadb } from "@/lib/prisma";

export const getDocumentsByOpportunityId = async (opportunityId: string) => {
  // Query through DocumentsToOpportunities junction table
  const data = await prismadb.documents.findMany({
    where: {
      opportunities: {
        some: {
          opportunity_id: opportunityId,
        },
      },
    },
    include: {
      created_by: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      assigned_to_user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      date_created: "desc",
    },
  });
  return data;
};
