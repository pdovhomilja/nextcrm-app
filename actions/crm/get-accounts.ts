import { cache } from "react";
import { prismadb } from "@/lib/prisma";
import { requireAuthenticated, accountReadScopeWhere } from "@/lib/authz";

export const getAccounts = cache(async () => {
  const user = await requireAuthenticated();
  const data = await prismadb.crm_Accounts.findMany({
    where: accountReadScopeWhere(user),
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
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  return data;
});
