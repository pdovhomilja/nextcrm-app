import { prismadb } from "@/lib/prisma";
import { requireAuthenticated, AuthenticationError } from "@/lib/authz";
import { invoiceReadScopeWhere } from "@/lib/invoices/permissions";

// Scoped to what the caller can read (no global totals for user/partner).
export const getInvoicesCount = async () => {
  try {
    const user = await requireAuthenticated({ partner: true });
    return await prismadb.invoices.count({ where: invoiceReadScopeWhere(user) });
  } catch (e) {
    if (e instanceof AuthenticationError) return 0;
    throw e;
  }
};
