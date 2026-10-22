"use server";
import { getSession } from "@/lib/auth-server";

import { decrypt } from "@/lib/email-crypto";
import { prismadb } from "@/lib/prisma";
import { serializeDecimals, serializeDecimalsList } from "@/lib/serialize-decimals";
import { assertPublicHost, HostNotAllowedError } from "@/lib/net/host-guard";
import nodemailer from "nodemailer";
import { EmailFolder, EmailSendProvider } from "@prisma/client";
import { sendMailViaResend } from "@/lib/email/resend-mail";
import { resolveMailboxAccess } from "@/lib/email/mailbox-access";
import { fetchUploadBuffer } from "@/lib/email/fetch-upload-buffer";
import { inngest } from "@/inngest/client";

const PAGE_SIZE = 50;
const MAX_COUNT = 10_000;

async function requireSession() {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id as string;
}

export async function getEmails(
  accountId: string,
  folder: EmailFolder,
  page: number,
  search?: string
) {
  try {
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
    return {
      emails: serializeDecimalsList(emails),
      total,
      page,
      totalPages: Math.ceil(total / PAGE_SIZE),
    };
  } catch (error) {
    console.error("[getEmails] Error:", error);
    return { emails: [], total: 0, page: 1, totalPages: 0 };
  }

}

export async function getEmail(id: string) {
  try {
    await requireSession();
    const email = await prismadb.email.findFirst({
      where: { id },
      select: {
        id: true,
        emailAccountId: true,
        subject: true,
        fromName: true,
        fromEmail: true,
        sentAt: true,
        isRead: true,
        folder: true,
        rfcMessageId: true,
        toRecipients: true,
        ccRecipients: true,
        bodyText: true,
        bodyHtml: true,
        attachments: true,
        imapUid: true,
      },
    });
    if (!email) throw new Error("Not found");
    await resolveMailboxAccess(email.emailAccountId);

    if (!email.bodyText && !email.bodyHtml) {
      void inngest.send({ name: "email/fetch-body", data: { emailId: id } }).catch(() => {});
    }

    // Mark as read (fire-and-forget)
    if (!email.isRead) {
      prismadb.email.update({ where: { id }, data: { isRead: true } }).catch(() => {});
    }

    return serializeDecimals(email);
  } catch (error) {
    console.error("[getEmail] Error:", error);
    return null;
  }
}

/** @deprecated Use trashEmail from mailbox-actions */
export async function deleteEmail(id: string) {
  const { trashEmail } = await import("@/actions/emails/mailbox-actions");
  await trashEmail(id);
}

export type SendEmailAttachmentInput = {
  url: string;
  name: string;
  mime: string;
};

type SendInput = {
  accountId: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  bodyHtml?: string;
  inReplyTo?: string;   // parent's Message-ID
  references?: string;  // parent's References + parent's Message-ID (space-separated)
  attachments?: SendEmailAttachmentInput[];
};

export async function sendEmail(input: SendInput) {
  await requireSession();
  const access = await resolveMailboxAccess(input.accountId);
  if (!access.canSend) throw new Error("You cannot send from this mailbox");

  const account = await prismadb.emailAccount.findUnique({
    where: { id: input.accountId },
  });
  if (!account) throw new Error("Account not found");

  const attachmentBuffers =
    input.attachments && input.attachments.length > 0
      ? await Promise.all(
          input.attachments.map(async (a) => ({
            filename: a.name,
            content: await fetchUploadBuffer(a.url),
            contentType: a.mime,
          }))
        )
      : undefined;

  let rfcMessageId: string;

  if (account.sendProvider === EmailSendProvider.RESEND) {
    const sent = await sendMailViaResend({
      fromEmail: account.username,
      fromName: account.fromName,
      label: account.label,
      to: input.to,
      cc: input.cc,
      bcc: input.bcc,
      subject: input.subject,
      text: input.body,
      html: input.bodyHtml,
      inReplyTo: input.inReplyTo,
      references: input.references,
      attachments: attachmentBuffers,
    });
    rfcMessageId = sent?.id ? `resend-${sent.id}` : `local-${crypto.randomUUID()}@nextcrm`;
  } else {
    if (!account.passwordEncrypted) throw new Error("Mailbox password is missing");

    let pinned: { address: string; hostname: string };
    try {
      pinned = await assertPublicHost(account.smtpHost);
    } catch (e) {
      if (e instanceof HostNotAllowedError) throw new Error("Mail host is not allowed");
      throw e;
    }

    const password = decrypt(account.passwordEncrypted);

    const transporter = nodemailer.createTransport({
      host: pinned.address,
      port: account.smtpPort,
      secure: account.smtpSsl,
      auth: { user: account.username, pass: password },
      ...({ servername: account.smtpHost } as { servername: string }),
      tls: { rejectUnauthorized: !account.allowSelfSignedTls },
    });

    const info = await transporter.sendMail({
      from: account.username,
      to: input.to.join(", "),
      cc: input.cc?.join(", "),
      bcc: input.bcc?.join(", "),
      subject: input.subject,
      text: input.body,
      html: input.bodyHtml,
      inReplyTo: input.inReplyTo,
      references: input.references,
      attachments: attachmentBuffers?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    });
    rfcMessageId = info.messageId ?? `local-${crypto.randomUUID()}@nextcrm`;
  }

  // Write sent message to DB immediately so it appears in Sent view
  await prismadb.email.create({
    data: {
      emailAccountId: input.accountId,
      userId: access.mailboxUserId,
      rfcMessageId,
      folder: EmailFolder.SENT,
      subject: input.subject,
      fromEmail: account.username,
      toRecipients: input.to.map((e) => ({ email: e })),
      ccRecipients: input.cc?.map((e) => ({ email: e })) ?? [],
      bccRecipients: input.bcc?.map((e) => ({ email: e })) ?? [],
      bodyText: input.body,
      bodyHtml: input.bodyHtml ?? null,
      attachments:
        input.attachments?.map((a) => ({
          url: a.url,
          name: a.name,
          mime: a.mime,
        })) ?? [],
      sentAt: new Date(),
      isRead: true,
    },
  });
}

export async function getUnreadInboxCount(): Promise<number> {
  try {
    const userId = await requireSession();
    return await prismadb.email.count({
      where: {
        userId,
        folder: EmailFolder.INBOX,
        isRead: false,
        isDeleted: false,
      },
    });
  } catch {
    return 0;
  }
}
