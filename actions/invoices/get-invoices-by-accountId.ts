import { prismadb } from "@/lib/prisma";
import {
  requireAuthenticated,
  assertCanReadAccount,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";
import { invoiceReadScopeWhere } from "@/lib/invoices/permissions";

export async function getInvoicesByAccountId(accountId: string) {
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

  return prismadb.invoices.findMany({
    where: { accountId, ...invoiceReadScopeWhere(user) },
    orderBy: { createdAt: "desc" },
    include: {
      account: { select: { id: true, name: true } },
      series: { select: { id: true, name: true } },
    },
  });
}
