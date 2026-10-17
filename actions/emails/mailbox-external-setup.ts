"use server";

import { EmailSendProvider } from "@prisma/client";
import { getSession } from "@/lib/auth-server";
import { decrypt } from "@/lib/email-crypto";
import {
  buildMailboxExternalSetupPublic,
  type MailboxExternalSetupPublic,
} from "@/lib/email/mailbox-external-setup";
import { prismadb } from "@/lib/prisma";
import { getResendApiKey } from "@/lib/resend";

async function requireOwnedAccount(accountId: string) {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Unauthorized");

  const account = await prismadb.emailAccount.findFirst({
    where: { id: accountId, userId },
    select: {
      id: true,
      label: true,
      username: true,
      fromName: true,
      sendProvider: true,
      smtpHost: true,
      smtpPort: true,
      smtpSsl: true,
      imapHost: true,
      imapPort: true,
      imapSsl: true,
      passwordEncrypted: true,
    },
  });
  if (!account) throw new Error("Mailbox not found");
  return account;
}

export async function getMailboxExternalSetup(
  accountId: string
): Promise<MailboxExternalSetupPublic | { error: string }> {
  try {
    const account = await requireOwnedAccount(accountId);
    return buildMailboxExternalSetupPublic(account);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to load setup" };
  }
}

/** SMTP password for external clients (mailbox owner only). */
export async function revealMailboxSmtpPassword(
  accountId: string
): Promise<{ password: string } | { error: string }> {
  try {
    const account = await requireOwnedAccount(accountId);

    if (account.sendProvider === EmailSendProvider.RESEND) {
      const apiKey = await getResendApiKey();
      if (!apiKey) {
        return {
          error:
            "Resend is not configured on this server. Ask an admin to set RESEND_API_KEY.",
        };
      }
      return { password: apiKey };
    }

    if (!account.passwordEncrypted) {
      return { error: "No stored password for this mailbox." };
    }
    return { password: decrypt(account.passwordEncrypted) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not reveal password" };
  }
}
