"use server";
import { getSession } from "@/lib/auth-server";

import { prismadb } from "@/lib/prisma";
import { encrypt } from "@/lib/email-crypto";
import {
  isAllowedImapPort,
  isAllowedSmtpPort,
  classifyMailError,
} from "@/lib/email/imap-safety";
import Imap from "imap";

async function requireSession() {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id as string;
}

export async function getEmailAccounts() {
  const userId = await requireSession();
  return prismadb.emailAccount.findMany({
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
      isActive: true,
      sentFolderName: true,
      lastSyncedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

type CreateInput = {
  label: string;
  imapHost: string;
  imapPort: number;
  imapSsl: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSsl: boolean;
  username: string;
  password: string;
  sentFolderName?: string;
};

export async function createEmailAccount(input: CreateInput) {
  const userId = await requireSession();

  // Validate required string fields
  if (!input.label?.trim()) throw new Error("Label is required");
  if (!input.imapHost?.trim()) throw new Error("IMAP host is required");
  if (!input.smtpHost?.trim()) throw new Error("SMTP host is required");
  if (!input.username?.trim()) throw new Error("Username is required");
  if (!input.password?.trim()) throw new Error("Password is required");
  // Restrict to real mail ports so a stored account cannot be used to reach
  // internal services (Postgres/MinIO/Inngest/metadata) on later connects.
  if (!isAllowedImapPort(input.imapPort)) throw new Error("Unsupported IMAP port");
  if (!isAllowedSmtpPort(input.smtpPort)) throw new Error("Unsupported SMTP port");

  const passwordEncrypted = encrypt(input.password);
  return prismadb.emailAccount.create({
    data: {
      userId,
      label: input.label,
      imapHost: input.imapHost,
      imapPort: input.imapPort,
      imapSsl: input.imapSsl,
      smtpHost: input.smtpHost,
      smtpPort: input.smtpPort,
      smtpSsl: input.smtpSsl,
      username: input.username,
      passwordEncrypted,
      ...(input.sentFolderName && { sentFolderName: input.sentFolderName }),
    },
    select: { id: true, label: true },
  });
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

  const connectionPromise = new Promise<{ ok: boolean; error?: string }>((resolve) => {
    const imap = new Imap({
      user: input.username,
      password: input.password,
      host: input.imapHost,
      port: input.imapPort,
      tls: input.imapSsl,
      // tlsOptions: { rejectUnauthorized: false } intentionally disabled for self-signed cert support
      tlsOptions: { rejectUnauthorized: false },
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

  return new Promise((resolve) => {
    const imap = new Imap({
      user: input.username,
      password: input.password,
      host: input.imapHost,
      port: input.imapPort,
      tls: input.imapSsl,
      tlsOptions: { rejectUnauthorized: false },
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
