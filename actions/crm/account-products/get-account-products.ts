import { cache } from "react";
import { prismadb } from "@/lib/prisma";
import {
  requireAuthenticated,
  assertCanReadAccount,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export const getAccountProducts = cache(async (accountId: string) => {
  let user;
  try {
    user = await requireAuthenticated();
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

  const assignments = await prismadb.crm_AccountProducts.findMany({
    where: { accountId },
    include: {
      product: {
        select: { id: true, name: true, sku: true, type: true, status: true, unit_price: true, unit: true, is_recurring: true, billing_period: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return assignments;
});
