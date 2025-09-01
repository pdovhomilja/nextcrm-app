"use server";

import Imap from "node-imap";
import mailcomposer from "mailcomposer";
import { auth } from "@/auth";
import db from "@/lib/db";
import { decrypt } from "@/lib/security/encryption";
import { sendMailWithResend } from "./resend-smtp";

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

// Unified function that handles both Resend and regular SMTP
export async function sendEmailUnified(
  accountId: string,
  to: string,
  subject: string,
  body: string
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Fetch the mail account
    const userMailAccount = await db.userMailAccount.findUnique({
      where: { id: accountId, userId: session.user.id },
    });

    if (!userMailAccount) {
      return { success: false, error: "Mail account not found" };
    }

    // Determine which service to use based on SMTP host
    if (userMailAccount.smtpHost === "smtp.resend.com") {
      return await sendMailWithResend(accountId, to, subject, body);
    } else {
      // Use regular IMAP/SMTP
      return await sendMail(accountId, to, subject, body);
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function sendMail(
  accountId: string,
  to: string,
  subject: string,
  body: string
) {
  let imap: Imap | null = null;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const account = await db.userMailAccount.findUnique({
      where: { id: accountId, userId: session.user.id },
    });

    if (!account) {
      return { success: false, error: "Mail account not found" };
    }

    //const smtpPassword = decrypt(account.smtpPassword!);

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
    if (!imap)
      return { success: false, error: "Could not connect to IMAP server" };

    await new Promise<void>((resolve, reject) => {
      imap!.append(rawEmail, { mailbox: "Sent" }, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  } finally {
    imap?.end();
  }
}
