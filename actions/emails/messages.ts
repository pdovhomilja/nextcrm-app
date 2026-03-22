"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { decrypt } from "@/lib/email-crypto";
import nodemailer from "nodemailer";
import { EmailFolder } from "@prisma/client";

const PAGE_SIZE = 50;
const MAX_COUNT = 10_000;

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id as string;
}

export async function getEmails(
  accountId: string,
  folder: EmailFolder,
  page: number,
  search?: string
) {
  const userId = await requireSession();

  const baseWhere = {
    userId,
    emailAccountId: accountId,
    folder,
    isDeleted: false,
  } as const;

  // Build where clause with optional text search fallback
  const where =
    search && search.length >= 3
      ? {
          ...baseWhere,
          OR: [
            { subject: { contains: search, mode: "insensitive" as const } },
            { fromEmail: { contains: search, mode: "insensitive" as const } },
            { fromName: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : baseWhere;

  const [emails, rawCount] = await Promise.all([
    prismadb.email.findMany({
      where,
      orderBy: { sentAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        subject: true,
        fromName: true,
        fromEmail: true,
        sentAt: true,
        isRead: true,
        folder: true,
      },
    }),
    prismadb.email.count({ where }),
  ]);

  const total = Math.min(rawCount, MAX_COUNT);
  return { emails, total, page, totalPages: Math.ceil(total / PAGE_SIZE) };
}

export async function getEmail(id: string) {
  const userId = await requireSession();
  const email = await prismadb.email.findFirst({
    where: { id, userId, isDeleted: false },
    include: {
      contacts: { include: { contact: { select: { id: true, first_name: true, last_name: true } } } },
      accounts: { include: { account: { select: { id: true, name: true } } } },
    },
  });
  if (!email) throw new Error("Not found");

  // Mark as read (fire-and-forget)
  if (!email.isRead) {
    prismadb.email.update({ where: { id }, data: { isRead: true } }).catch(() => {});
  }

  return email;
}

export async function deleteEmail(id: string) {
  const userId = await requireSession();
  const email = await prismadb.email.findFirst({ where: { id, userId, isDeleted: false } });
  if (!email) throw new Error("Not found");
  await prismadb.email.update({ where: { id }, data: { isDeleted: true } });
}

type SendInput = {
  accountId: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  inReplyTo?: string;   // parent's Message-ID
  references?: string;  // parent's References + parent's Message-ID (space-separated)
};

export async function sendEmail(input: SendInput) {
  const userId = await requireSession();

  const account = await prismadb.emailAccount.findFirst({
    where: { id: input.accountId, userId },
  });
  if (!account) throw new Error("Account not found");

  const password = decrypt(account.passwordEncrypted);

  const transporter = nodemailer.createTransport({
    host: account.smtpHost,
    port: account.smtpPort,
    secure: account.smtpSsl,
    auth: { user: account.username, pass: password },
  });

  const info = await transporter.sendMail({
    from: account.username,
    to: input.to.join(", "),
    cc: input.cc?.join(", "),
    bcc: input.bcc?.join(", "),
    subject: input.subject,
    text: input.body,
    inReplyTo: input.inReplyTo,
    references: input.references,
  });

  // Write sent message to DB immediately so it appears in Sent view
  await prismadb.email.create({
    data: {
      emailAccountId: input.accountId,
      userId,
      rfcMessageId: info.messageId ?? `local-${crypto.randomUUID()}@nextcrm`,
      folder: EmailFolder.SENT,
      subject: input.subject,
      fromEmail: account.username,
      toRecipients: input.to.map((e) => ({ email: e })),
      ccRecipients: input.cc?.map((e) => ({ email: e })) ?? [],
      bccRecipients: input.bcc?.map((e) => ({ email: e })) ?? [],
      bodyText: input.body,
      sentAt: new Date(),
      isRead: true,
    },
  });
}
