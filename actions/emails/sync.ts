"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { inngest } from "@/inngest/client";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id as string;
}

export async function triggerSync(accountId: string) {
  const userId = await requireSession();

  const account = await prismadb.emailAccount.findFirst({
    where: { id: accountId, userId },
    select: { id: true },
  });
  if (!account) throw new Error("Account not found");

  await inngest.send({ name: "email/sync-account", data: { accountId } });
}
