import { prismadb } from "@/lib/prisma";
import { requireAuthenticated, AuthenticationError } from "@/lib/authz";
import { contactReadScopeWhere } from "@/lib/authz/scopes/crm";

// Scoped to what the caller can read (no global totals for user/partner).
export const getContactCount = async () => {
  try {
    const user = await requireAuthenticated({ partner: true });
    return await prismadb.crm_Contacts.count({ where: contactReadScopeWhere(user) });
  } catch (e) {
    if (e instanceof AuthenticationError) return 0;
    throw e;
  }
};
