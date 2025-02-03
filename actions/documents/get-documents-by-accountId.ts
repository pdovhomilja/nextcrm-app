import { prismadb } from "@/lib/prisma";

export const getDocumentsByAccountId = async (accountId: string) => {
  const data = await prismadb.documents.findMany({
    where: {
      accounts: {
        some: {
          accountId: accountId,
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
