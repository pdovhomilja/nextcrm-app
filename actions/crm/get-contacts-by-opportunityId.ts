import { prismadb } from "@/lib/prisma";
import {
  requireAuthenticated,
  assertCanReadOpportunity,
  contactReadScopeWhere,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export const getContactsByOpportunityId = async (opportunityId: string) => {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return [];
    throw e;
  }

  try {
    // Verify access to the parent opportunity first; return [] on miss to
    // avoid existence leaks of opportunities the caller cannot read.
    await assertCanReadOpportunity(user, opportunityId);
  } catch (e) {
    if (e instanceof AuthorizationError) return [];
    throw e;
  }

  // Defense in depth: parent-opportunity access + contact ownership scope +
  // existing junction filter combined.
  const data = await prismadb.crm_Contacts.findMany({
    where: {
      ...contactReadScopeWhere(user),
      // Filter through ContactsToOpportunities junction table
      opportunities: {
        some: {
          opportunity_id: opportunityId,
        },
      },
    },
    include: {
      assigned_to_user: {
        select: {
          name: true,
        },
      },
      crate_by_user: {
        select: {
          name: true,
        },
      },
      assigned_accounts: true,
    },
  });
  return data;
};
