"use server";

import { unstable_cache } from "next/cache";
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

const accountSelect = {
  id: true,
  label: true,
  username: true,
  fromName: true,
  userId: true,
  delegateUserIds: true,
  user: { select: { name: true, email: true } },
} as const;

async function loadAccessibleAccounts(
  userId: string,
  elevated: boolean
): Promise<AccessibleEmailAccount[]> {
  const rows = await prismadb.emailAccount.findMany({
    where: elevated
      ? { isActive: true }
      : {
          isActive: true,
          OR: [{ userId }, { delegateUserIds: { has: userId } }],
        },
    select: accountSelect,
    orderBy: elevated
      ? [{ user: { email: "asc" } }, { createdAt: "asc" }]
      : { createdAt: "asc" },
  });

  return rows.map((a) => {
    let accessKind: MailboxAccessKind = "delegate";
    if (a.userId === userId) accessKind = "owner";
    else if (a.delegateUserIds.includes(userId)) accessKind = "delegate";
    else if (elevated) accessKind = "admin";

    return {
      id: a.id,
      label: a.label,
      username: a.username,
      fromName: a.fromName,
      accessKind,
      ownerName: a.user.name,
      ownerEmail: a.user.email,
    };
  });
}

const cachedAccountsForUser = unstable_cache(
  async (userId: string, elevated: boolean) => loadAccessibleAccounts(userId, elevated),
  ["accessible-email-accounts-v2"],
  { revalidate: 120 }
);

/** Mailboxes the signed-in user may view (own, delegated, or all for admin/manager). */
export async function getAccessibleEmailAccounts(): Promise<AccessibleEmailAccount[]> {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) return [];

  let elevated = false;
  try {
    await requireRole(["admin", "manager"]);
    elevated = true;
  } catch (e) {
    if (!(e instanceof AuthorizationError)) throw e;
  }

  return serializeDecimalsList(await cachedAccountsForUser(userId, elevated));
}
