"use server";

import { prismadb } from "@/lib/prisma";
import {
  requireAuthenticated,
  accountReadScopeWhere,
  AuthenticationError,
} from "@/lib/authz";
import { withSearchCache } from "@/lib/cache/search-cache";

const PAGE_SIZE_MAX = 100;

export async function searchAccounts({
  search = "",
  skip = 0,
  take = 50,
}: {
  search?: string;
  skip?: number;
  take?: number;
} = {}) {
  try {
    const user = await requireAuthenticated();

    const safeTake = Math.min(PAGE_SIZE_MAX, Math.max(1, take));
    const safeSkip = Math.max(0, skip);

    return withSearchCache(
      user.id,
      "accounts",
      {
        search: search.trim().toLowerCase(),
        skip: safeSkip,
        take: safeTake,
        role: String(user.role ?? ""),
      },
      60,
      async () => {
        const where = {
          ...accountReadScopeWhere(user),
          ...(search
            ? { name: { contains: search, mode: "insensitive" as const } }
            : {}),
        };

        const [accounts, total] = await prismadb.$transaction([
          prismadb.crm_Accounts.findMany({
            where,
            select: { id: true, name: true },
            orderBy: { name: "asc" },
            skip: safeSkip,
            take: safeTake,
          }),
          prismadb.crm_Accounts.count({ where }),
        ]);

        return { accounts, total, hasMore: safeSkip + safeTake < total };
      }
    );
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return { error: "Unauthorized", accounts: [], total: 0, hasMore: false };
    }
    return {
      error: "Failed to search accounts",
      accounts: [],
      total: 0,
      hasMore: false,
    };
  }
}
