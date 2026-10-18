import { prismadb } from "@/lib/prisma";
import {
  requireAuthenticated,
  assertCanReadContact,
  documentReadScopeWhere,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export const getDocumentsByContactId = async (contactId: string) => {
  let user;
  try {
    user = await requireAuthenticated({ partner: true });
  } catch (e) {
    if (e instanceof AuthenticationError) return [];
    throw e;
  }
  try {
    await assertCanReadContact(user, contactId);
  } catch (e) {
    if (e instanceof AuthorizationError) return [];
    throw e;
  }

  // Query through DocumentsToContacts junction table
  const data = await prismadb.documents.findMany({
    where: {
      contacts: {
        some: {
          contact_id: contactId,
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
