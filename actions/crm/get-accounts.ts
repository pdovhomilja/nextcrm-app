import { prismadb } from "@/lib/prisma";

export const getAccounts = async () => {
  const data = await prismadb.crm_Accounts.findMany({
    include: {
      assigned_to_user: {
        select: {
          name: true,
        },
      },
      contacts: {
        select: {
          first_name: true,
          last_name: true,
        },
      },
      // Watchers relationship through AccountWatchers junction table
      watchers: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  return data;
};
