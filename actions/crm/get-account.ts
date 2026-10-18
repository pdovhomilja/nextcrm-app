import { prismadb } from "@/lib/prisma";
import {
  requireAuthenticated,
  assertCanReadAccount,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export const getAccount = async (accountId: string) => {
  let user;
  try {
    user = await requireAuthenticated({ partner: true });
  } catch (e) {
    if (e instanceof AuthenticationError) return null;
    throw e;
  }

  try {
    await assertCanReadAccount(user, accountId);
  } catch (e) {
    if (e instanceof AuthorizationError) return null;
    throw e;
  }

  const data = await prismadb.crm_Accounts.findFirst({
    where: {
      id: accountId,
      deletedAt: null,
    },
    include: {
      contacts: true,
      opportunities: true,
      pricelist: { select: { name: true } },
      // Documents relationship through DocumentsToAccounts junction table
      documents: {
        include: {
          document: {
            select: {
              id: true,
              document_name: true,
              document_type: true,
              document_file_url: true,
              document_file_mimeType: true,
              createdAt: true,
              created_by: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      },
      assigned_to_user: {
        select: {
          name: true,
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
  });
  return data;
};
