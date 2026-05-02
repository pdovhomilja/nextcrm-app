"use server";
import { prismadb } from "@/lib/prisma";
import {
  requireAuthenticated,
  accountReadScopeWhere,
  AuthenticationError,
} from "@/lib/authz";

export const getAccounts = async () => {
  try {
    const user = await requireAuthenticated();
    const accounts = await prismadb.crm_Accounts.findMany({
      where: accountReadScopeWhere(user),
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return { data: accounts };
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return { error: "Unauthorized" };
    }
    return { error: "Failed to fetch accounts" };
  }
};
