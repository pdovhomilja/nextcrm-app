"use server";
import { getSession } from "@/lib/auth-server";

import { prismadb } from "@/lib/prisma";

const PAGE_SIZE_MAX = 100;

export async function searchUsers({
  search = "",
  skip = 0,
  take = 50,
}: {
  search?: string;
  skip?: number;
  take?: number;
} = {}) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const safeTake = Math.min(PAGE_SIZE_MAX, Math.max(1, take));
  const safeSkip = Math.max(0, skip);

  const where = {
    userStatus: "ACTIVE" as const,
    ...(search
      ? { name: { contains: search, mode: "insensitive" as const } }
      : {}),
  };

  const [users, total] = await prismadb.$transaction([
    prismadb.users.findMany({
      where,
      select: { id: true, name: true, avatar: true },
      orderBy: { name: "asc" },
      skip: safeSkip,
      take: safeTake,
    }),
    prismadb.users.count({ where }),
  ]);

  return { users, total, hasMore: safeSkip + safeTake < total };
}
