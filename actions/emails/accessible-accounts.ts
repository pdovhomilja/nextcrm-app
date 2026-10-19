"use server";

import { getSession } from "@/lib/auth-server";
import { requireRole, AuthorizationError } from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import { serializeDecimalsList } from "@/lib/serialize-decimals";
import type { MailboxAccessKind } from "@/lib/email/mailbox-access";

export type AccessibleEmailAccount = {
  id: string;
  label: string;
  username: string;
  fromName: string | null;
  accessKind: MailboxAccessKind;
  ownerName: string | null;
  ownerEmail: string | null;
};

/** Mailboxes the signed-in user may view (own, delegated, or all for admin/manager). */
export async function getAccessibleEmailAccounts(): Promise<AccessibleEmailAccount[]> {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) return [];

  const select = {
    id: true,
    label: true,
    username: true,
    fromName: true,
    userId: true,
    delegateUserIds: true,
    user: { select: { name: true, email: true } },
  } as const;

  const owned = await prismadb.emailAccount.findMany({
    where: { userId, isActive: true },
    select,
    orderBy: { createdAt: "asc" },
  });

  const delegated = await prismadb.emailAccount.findMany({
    where: { isActive: true, delegateUserIds: { has: userId } },
    select,
    orderBy: { createdAt: "asc" },
  });

  let elevated: typeof owned = [];
  try {
    await requireRole(["admin", "manager"]);
    elevated = await prismadb.emailAccount.findMany({
      where: { isActive: true },
      select,
      orderBy: [{ user: { email: "asc" } }, { createdAt: "asc" }],
    });
  } catch (e) {
    if (!(e instanceof AuthorizationError)) throw e;
  }

  const byId = new Map<string, AccessibleEmailAccount>();

  for (const a of owned) {
    byId.set(a.id, {
      id: a.id,
      label: a.label,
      username: a.username,
      fromName: a.fromName,
      accessKind: "owner",
      ownerName: a.user.name,
      ownerEmail: a.user.email,
    });
  }

  for (const a of delegated) {
    if (byId.has(a.id)) continue;
    byId.set(a.id, {
      id: a.id,
      label: a.label,
      username: a.username,
      fromName: a.fromName,
      accessKind: "delegate",
      ownerName: a.user.name,
      ownerEmail: a.user.email,
    });
  }

  for (const a of elevated) {
    if (byId.has(a.id)) continue;
    byId.set(a.id, {
      id: a.id,
      label: a.label,
      username: a.username,
      fromName: a.fromName,
      accessKind: "admin",
      ownerName: a.user.name,
      ownerEmail: a.user.email,
    });
  }

  return serializeDecimalsList(Array.from(byId.values()));
}
