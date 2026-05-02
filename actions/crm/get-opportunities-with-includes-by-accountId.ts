import { prismadb } from "@/lib/prisma";
import {
  requireAuthenticated,
  assertCanReadAccount,
  opportunityReadScopeWhere,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export const getOpportunitiesFullByAccountId = async (accountId: string) => {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return [];
    throw e;
  }

  try {
    // Verify access to the parent account first; return [] on miss to avoid
    // existence leaks of accounts the caller cannot read.
    await assertCanReadAccount(user, accountId);
  } catch (e) {
    if (e instanceof AuthorizationError) return [];
    throw e;
  }

  // Defense in depth: scope the opportunity list by ownership rules even
  // when the caller has access to the parent account.
  const data = await prismadb.crm_Opportunities.findMany({
    where: {
      account: accountId,
      ...opportunityReadScopeWhere(user),
    },
    include: {
      assigned_account: {
        select: {
          name: true,
        },
      },
      assigned_sales_stage: {
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
      created_on: "desc",
    },
  });

  return data;
};
