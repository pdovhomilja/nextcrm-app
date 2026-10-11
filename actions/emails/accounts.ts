"use server";
import { getSession } from "@/lib/auth-server";

import { prismadb } from "@/lib/prisma";
import { EmailSendProvider } from "@prisma/client";
import { encrypt } from "@/lib/email-crypto";
import resendHelper from "@/lib/resend";
import { formatResendFromAddress } from "@/lib/email/resend-mail";
import { serializeDecimalsList } from "@/lib/serialize-decimals";
import {
  isAllowedImapPort,
  isAllowedSmtpPort,
  classifyMailError,
} from "@/lib/email/imap-safety";
import { assertPublicHost, HostNotAllowedError } from "@/lib/net/host-guard";
import Imap from "imap";

async function requireSession() {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id as string;
}

export async function getEmailAccounts() {
  try {
    const userId = await requireSession();
    const accounts = await prismadb.emailAccount.findMany({
      where: { userId },
      select: {
        id: true,
        label: true,
        imapHost: true,
        imapPort: true,
        imapSsl: true,
        smtpHost: true,
        smtpPort: true,
        smtpSsl: true,
        username: true,
        sendProvider: true,
        fromName: true,
        isActive: true,
        allowSelfSignedTls: true,
        sentFolderName: true,
        lastSyncedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });
    return serializeDecimalsList(accounts);
  } catch (error) {
    console.error("[getEmailAccounts] Error:", error);
    return [];
  }
}

const RESEND_SEND_ONLY_HOST = "resend.send-only";

export type CreateEmailAccountInput = {
  sendProvider?: EmailSendProvider;
  fromName?: string;
  label: string;
  imapHost?: string;
  imapPort?: number;
  imapSsl?: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpSsl?: boolean;
  allowSelfSignedTls?: boolean;
  username: string;
  password?: string;
  sentFolderName?: string;
};

export async function createEmailAccountForUser(userId: string, input: CreateEmailAccountInput) {
  if (!input.label?.trim()) throw new Error("Label is required");
  if (!input.username?.trim()) throw new Error("Username is required");

  const sendProvider =
    input.sendProvider ??
    (input.imapHost?.trim() || input.smtpHost?.trim()
      ? EmailSendProvider.SMTP
      : EmailSendProvider.RESEND);

  if (sendProvider === EmailSendProvider.RESEND) {
    if (!input.username.includes("@")) {
      throw new Error("From email must be a valid address (verified in Resend)");
    }
    try {
      formatResendFromAddress({
        fromEmail: input.username,
        fromName: input.fromName,
        label: input.label,
      });
    } catch (e) {
      throw e instanceof Error ? e : new Error("Invalid Resend from address");
    }
    await resendHelper();

    const passwordEncrypted = input.password?.trim() ? encrypt(input.password) : null;
    return prismadb.emailAccount.create({
      data: {
        userId,
        label: input.label.trim(),
        sendProvider: EmailSendProvider.RESEND,
        fromName: input.fromName?.trim() || null,
        username: input.username.trim(),
        passwordEncrypted,
        imapHost: RESEND_SEND_ONLY_HOST,
        imapPort: 993,
        imapSsl: true,
        smtpHost: RESEND_SEND_ONLY_HOST,
        smtpPort: 465,
        smtpSsl: true,
        allowSelfSignedTls: false,
        ...(input.sentFolderName && { sentFolderName: input.sentFolderName }),
      },
      select: { id: true, label: true },
    });
  }

  if (!input.imapHost?.trim()) throw new Error("IMAP host is required");
  if (!input.smtpHost?.trim()) throw new Error("SMTP host is required");
  if (!input.password?.trim()) throw new Error("Password is required");
  if (input.imapPort == null || !isAllowedImapPort(input.imapPort)) {
    throw new Error("Unsupported IMAP port");
  }
  if (input.smtpPort == null || !isAllowedSmtpPort(input.smtpPort)) {
    throw new Error("Unsupported SMTP port");
  }

  try {
    await assertPublicHost(input.imapHost);
    await assertPublicHost(input.smtpHost);
  } catch (e) {
    if (e instanceof HostNotAllowedError) throw new Error("Mail host is not allowed");
    throw e;
  }

  const passwordEncrypted = encrypt(input.password);
  return prismadb.emailAccount.create({
    data: {
      userId,
      label: input.label,
      sendProvider: EmailSendProvider.SMTP,
      imapHost: input.imapHost,
      imapPort: input.imapPort,
      imapSsl: input.imapSsl ?? true,
      smtpHost: input.smtpHost,
      smtpPort: input.smtpPort,
      smtpSsl: input.smtpSsl ?? true,
      allowSelfSignedTls: input.allowSelfSignedTls ?? false,
      username: input.username,
      passwordEncrypted,
      ...(input.sentFolderName && { sentFolderName: input.sentFolderName }),
    },
    select: { id: true, label: true },
  });
}

export async function testResendMailbox(input: {
  username: string;
  fromName?: string;
  label?: string;
}): Promise<{ ok: boolean; error?: string }> {
  await requireSession();
  try {
    formatResendFromAddress({
      fromEmail: input.username,
      fromName: input.fromName,
      label: input.label,
    });
    await resendHelper();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Resend check failed" };
  }
}

export async function createEmailAccount(input: CreateEmailAccountInput) {
  const userId = await requireSession();
  return createEmailAccountForUser(userId, input);
}

export async function deleteEmailAccount(id: string) {
  const userId = await requireSession();
  const account = await prismadb.emailAccount.findFirst({ where: { id, userId } });
  if (!account) throw new Error("Not found");
  await prismadb.emailAccount.delete({ where: { id } });
}

export async function setEmailAccountActive(id: string, isActive: boolean) {
  const userId = await requireSession();
  const account = await prismadb.emailAccount.findFirst({ where: { id, userId } });
  if (!account) throw new Error("Not found");
  return prismadb.emailAccount.update({ where: { id }, data: { isActive } });
}

type TestInput = {
  imapHost: string;
  imapPort: number;
  imapSsl: boolean;
  allowSelfSignedTls?: boolean;
  username: string;
  password: string;
};

export async function testEmailConnection(
  input: TestInput
): Promise<{ ok: boolean; error?: string }> {
  await requireSession();

  if (!isAllowedImapPort(input.imapPort)) {
    return { ok: false, error: "Unsupported IMAP port" };
  }

  let pinned: { address: string; hostname: string };
  try {
    pinned = await assertPublicHost(input.imapHost);
  } catch (e) {
    if (e instanceof HostNotAllowedError) {
      // Indistinguishable from a real unreachable host — no SSRF oracle.
      return { ok: false, error: classifyMailError({ message: "ECONNREFUSED" } as Error) };
    }
    throw e;
  }

  const connectionPromise = new Promise<{ ok: boolean; error?: string }>((resolve) => {
    const imap = new Imap({
      user: input.username,
      password: input.password,
      host: pinned.address,
      port: input.imapPort,
      tls: input.imapSsl,
      // Dial the validated IP; keep the hostname for TLS SNI and verify the
      // certificate against it. Self-signed servers opt out per account.
      tlsOptions: { servername: pinned.hostname, rejectUnauthorized: !input.allowSelfSignedTls },
      authTimeout: 8000,
      connTimeout: 8000,
    });
    imap.once("ready", () => {
      imap.end();
      resolve({ ok: true });
    });
    imap.once("error", (err: Error) => {
      // Log the real error server-side; return a classified message so
      // protocol/banner text cannot leak to the caller (SSRF oracle).
      console.error("[testEmailConnection] IMAP error:", err.message);
      resolve({ ok: false, error: classifyMailError(err) });
    });
    imap.connect();
  });

  const timeoutPromise = new Promise<{ ok: boolean; error?: string }>((resolve) =>
    setTimeout(() => resolve({ ok: false, error: "Connection timed out" }), 10000)
  );

  return Promise.race([connectionPromise, timeoutPromise]);
}

type ListFoldersInput = {
  imapHost: string;
  imapPort: number;
  imapSsl: boolean;
  allowSelfSignedTls?: boolean;
  username: string;
  password: string;
};

export async function listImapFolders(
  input: ListFoldersInput
): Promise<{ ok: true; folders: string[] } | { ok: false; error: string }> {
  await requireSession();

  if (!isAllowedImapPort(input.imapPort)) {
    return { ok: false, error: "Unsupported IMAP port" };
  }

  let pinned: { address: string; hostname: string };
  try {
    pinned = await assertPublicHost(input.imapHost);
  } catch (e) {
    if (e instanceof HostNotAllowedError) {
      return { ok: false, error: classifyMailError({ message: "ECONNREFUSED" } as Error) };
    }
    throw e;
  }

  return new Promise((resolve) => {
    const imap = new Imap({
      user: input.username,
      password: input.password,
      host: pinned.address,
      port: input.imapPort,
      tls: input.imapSsl,
      // Dial the validated IP; keep the hostname for TLS SNI and verify the
      // certificate against it. Self-signed servers opt out per account.
      tlsOptions: { servername: pinned.hostname, rejectUnauthorized: !input.allowSelfSignedTls },
      authTimeout: 8000,
      connTimeout: 8000,
    });

    imap.once("ready", () => {
      imap.getBoxes("", (err, boxes) => {
        imap.end();
        if (err) {
          console.error("[listImapFolders] getBoxes error:", err.message);
          return resolve({ ok: false, error: classifyMailError(err) });
        }

        const names: string[] = [];
        function walk(node: Imap.MailBoxes, prefix: string) {
          for (const [name, box] of Object.entries(node)) {
            const full = prefix ? `${prefix}${box.delimiter ?? "/"}${name}` : name;
            names.push(full);
            if (box.children) walk(box.children, full);
          }
        }
        walk(boxes, "");
        resolve({ ok: true, folders: names.sort() });
      });
    });

    imap.once("error", (err: Error) => {
      console.error("[listImapFolders] IMAP error:", err.message);
      resolve({ ok: false, error: classifyMailError(err) });
    });
    imap.connect();

    setTimeout(() => resolve({ ok: false, error: "Connection timed out" }), 10000);
  });
}
