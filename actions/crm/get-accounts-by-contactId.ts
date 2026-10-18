import { prismadb } from "@/lib/prisma";
import {
  requireAuthenticated,
  accountReadScopeWhere,
  AuthenticationError,
} from "@/lib/authz";

export const getAccountsByContactId = async (contactId: string) => {
  let user;
  try {
    user = await requireAuthenticated({ partner: true });
  } catch (e) {
    if (e instanceof AuthenticationError) return [];
    throw e;
  }
  const data = await prismadb.crm_Accounts.findMany({
    where: {
      ...accountReadScopeWhere(user),
      contacts: {
        some: {
          id: contactId,
        },
      },
    },
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
};
