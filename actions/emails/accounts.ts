"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { encrypt } from "@/lib/email-crypto";
import Imap from "imap";

async function requireSession() {
  const session = await getServerSession(authOptions);
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
  if (input.imapPort < 1 || input.imapPort > 65535) throw new Error("Invalid IMAP port");
  if (input.smtpPort < 1 || input.smtpPort > 65535) throw new Error("Invalid SMTP port");

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
      resolve({ ok: false, error: err.message });
    });
    imap.connect();
  });

  const timeoutPromise = new Promise<{ ok: boolean; error?: string }>((resolve) =>
    setTimeout(() => resolve({ ok: false, error: "Connection timed out" }), 10000)
  );

  return Promise.race([connectionPromise, timeoutPromise]);
}
