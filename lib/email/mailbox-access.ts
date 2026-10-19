import { getSession } from "@/lib/auth-server";
import { requireRole, AuthorizationError } from "@/lib/authz";
import { prismadb } from "@/lib/prisma";

export type MailboxAccessKind = "owner" | "delegate" | "admin";

export type MailboxAccess = {
  accountId: string;
  mailboxUserId: string;
  accessKind: MailboxAccessKind;
  canSend: boolean;
  username: string;
  fromName: string | null;
  label: string;
  sendProvider: import("@prisma/client").EmailSendProvider;
};

export async function resolveMailboxAccess(accountId: string): Promise<MailboxAccess> {
  const session = await getSession();
  const sessionUserId = session?.user?.id;
  if (!sessionUserId) throw new Error("Unauthorized");

  const account = await prismadb.emailAccount.findUnique({
    where: { id: accountId },
    select: {
      id: true,
      userId: true,
      username: true,
      fromName: true,
      label: true,
      sendProvider: true,
      delegateUserIds: true,
      isActive: true,
    },
  });
  if (!account || !account.isActive) throw new Error("Account not found");

  if (account.userId === sessionUserId) {
    return {
      accountId: account.id,
      mailboxUserId: account.userId,
      accessKind: "owner",
      canSend: true,
      username: account.username,
      fromName: account.fromName,
      label: account.label,
      sendProvider: account.sendProvider,
    };
  }

  if (account.delegateUserIds.includes(sessionUserId)) {
    return {
      accountId: account.id,
      mailboxUserId: account.userId,
      accessKind: "delegate",
      canSend: true,
      username: account.username,
      fromName: account.fromName,
      label: account.label,
      sendProvider: account.sendProvider,
    };
  }

  try {
    await requireRole(["admin", "manager"]);
    return {
      accountId: account.id,
      mailboxUserId: account.userId,
      accessKind: "admin",
      canSend: true,
      username: account.username,
      fromName: account.fromName,
      label: account.label,
      sendProvider: account.sendProvider,
    };
  } catch (e) {
    if (e instanceof AuthorizationError) throw new Error("Account not found");
    throw e;
  }
}
