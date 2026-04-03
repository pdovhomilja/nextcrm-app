"use server";
import { getSession } from "@/lib/auth-server";

import { prismadb } from "@/lib/prisma";

export async function getUserById(userId: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const user = await prismadb.users.findFirst({
    where: { id: userId, userStatus: "ACTIVE" },
    select: { id: true, name: true, avatar: true },
  });

  return user ?? null;
}
