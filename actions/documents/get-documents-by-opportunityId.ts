import { prismadb } from "@/lib/prisma";

export const getDocumentsByOpportunityId = async (opportunityId: string) => {
  const data = await prismadb.documents.findMany({
    where: {
      contactsIDs: {
        has: opportunityId,
      },
    },
    include: {
      created_by: {
        select: {
          name: true,
        },
      },
      assigned_to_user: {
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
