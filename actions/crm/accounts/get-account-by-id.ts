"use server";

import { prismadb } from "@/lib/prisma";

export async function getAccountById(accountId: string) {
  const account = await prismadb.crm_Accounts.findFirst({
    where: { id: accountId, deletedAt: null },
    select: { id: true, name: true },
  });

  return account ?? null;
}
