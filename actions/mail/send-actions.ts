"use server";

import Imap from "node-imap";
import mailcomposer from "mailcomposer";
import { auth } from "@/auth";
import db from "@/lib/db";
import { decrypt } from "@/lib/security/encryption";

async function getImapConnection(accountId: string): Promise<Imap | null> {
  console.log(`[IMAP] Attempting to connect for account: ${accountId}`);
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const account = await db.userMailAccount.findUnique({
    where: { id: accountId, userId: session.user.id },
  });

  if (!account) {
    throw new Error("Mail account not found");
  }

  const imap = new Imap({
    user: account.imapUser,
    password: decrypt(account.encryptedPassword),
    host: account.imapHost,
    port: account.imapPort,
    tls: true,
    tlsOptions: { rejectUnauthorized: false }, // Consider making this configurable
  });

  return new Promise((resolve, reject) => {
    imap.once("ready", () => {
      console.log("[IMAP] Connection successful");
      resolve(imap);
    });
    imap.once("error", (err: Error) => {
      console.error("[IMAP] Connection Error:", err);
      reject(err);
    });
    imap.connect();
  });
}

export async function sendMail(
  accountId: string,
  to: string,
  subject: string,
  body: string,
) {
  let imap: Imap | null = null;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    const account = await db.userMailAccount.findUnique({
      where: { id: accountId, userId: session.user.id },
    });

    if (!account) {
      return { error: "Mail account not found" };
    }

    const mail = mailcomposer({
      from: account.email,
      to,
      subject,
      text: body,
    });

    const rawEmail = await new Promise<string>((resolve, reject) => {
      mail.build((err, message) => {
        if (err) return reject(err);
        resolve(message.toString());
      });
    });

    imap = await getImapConnection(accountId);
    if (!imap) return { error: "Could not connect to IMAP server" };

    await new Promise<void>((resolve, reject) => {
      imap!.append(rawEmail, { mailbox: "Sent" }, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  } finally {
    imap?.end();
  }
}
