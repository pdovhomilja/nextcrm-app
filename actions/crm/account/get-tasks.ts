import { prismadb } from "@/lib/prisma";
import {
  requireAuthenticated,
  assertCanReadAccount,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";
import { crmTaskReadScopeWhere } from "@/lib/authz/scopes/crm";

export const getAccountsTasks = async (accountId: string) => {
  let user;
  try {
    user = await requireAuthenticated({ partner: true });
  } catch (e) {
    if (e instanceof AuthenticationError) return [];
    throw e;
  }
  try {
    await assertCanReadAccount(user, accountId);
  } catch (e) {
    if (e instanceof AuthorizationError) return [];
    throw e;
  }

  const data = await prismadb.crm_Accounts_Tasks.findMany({
    where: {
      account: accountId,
      ...crmTaskReadScopeWhere(user),
    },
    include: {
      assigned_user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
  return data;
};
