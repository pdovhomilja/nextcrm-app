"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";

export async function getUserById(userId: string) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Unauthorized");

  const user = await prismadb.users.findFirst({
    where: { id: userId, userStatus: "ACTIVE" },
    select: { id: true, name: true, avatar: true },
  });

  return user ?? null;
}
