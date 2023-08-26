import { prismadb } from "@/lib/prisma";

export const getDocumentsByAccountId = async (accountId: string) => {
  const data = await prismadb.documents.findMany({
    where: {
      accountsIDs: {
        has: accountId,
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
