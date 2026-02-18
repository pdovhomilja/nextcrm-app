import { prismadb } from "@/lib/prisma";

export const getDocumentsByAccountId = async (accountId: string) => {
  // Query through DocumentsToAccounts junction table
  const data = await prismadb.documents.findMany({
    where: {
      accounts: {
        some: {
          account_id: accountId,
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
