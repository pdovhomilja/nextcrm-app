"use server";
import { getSession } from "@/lib/auth-server";

import { prismadb } from "@/lib/prisma";

export async function getUserById(userId: string) {
  const session = await getSession({ partner: true });
  if (!session) throw new Error("Unauthorized");
  // A partner's user directory is himself (partner-role spec).
  if (session.user.role === "partner" && userId !== session.user.id) return null;

  const user = await prismadb.users.findFirst({
    where: { id: userId, userStatus: "ACTIVE" },
    select: { id: true, name: true, avatar: true },
  });

  return user ?? null;
}
