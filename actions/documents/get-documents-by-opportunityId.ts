import { prismadb } from "@/lib/prisma";
import {
  requireAuthenticated,
  assertCanReadOpportunity,
  documentReadScopeWhere,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export const getDocumentsByOpportunityId = async (opportunityId: string) => {
  let user;
  try {
    user = await requireAuthenticated({ partner: true });
  } catch (e) {
    if (e instanceof AuthenticationError) return [];
    throw e;
  }
  try {
    await assertCanReadOpportunity(user, opportunityId);
  } catch (e) {
    if (e instanceof AuthorizationError) return [];
    throw e;
  }

  // Query through DocumentsToOpportunities junction table
  const data = await prismadb.documents.findMany({
    where: {
      opportunities: {
        some: {
          opportunity_id: opportunityId,
        },
      },
      ...documentReadScopeWhere(user),
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
