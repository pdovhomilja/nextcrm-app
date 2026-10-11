"use server";

import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import {
  mailboxViewWhere,
  parseMailboxView,
  type MailboxView,
} from "@/lib/email/mailbox-views";
import { EmailFolder } from "@prisma/client";
import { serializeDecimalsList } from "@/lib/serialize-decimals";

const PAGE_SIZE = 50;
const MAX_COUNT = 10_000;

async function requireSession() {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id as string;
}

async function ownedEmail(id: string, userId: string) {
  const email = await prismadb.email.findFirst({ where: { id, userId } });
  if (!email) throw new Error("Not found");
  return email;
}

export async function getMailboxEmails(
  accountId: string,
  viewRaw: string | undefined,
  page: number,
  search?: string,
  unreadOnly?: boolean
) {
  try {
    const userId = await requireSession();
    const view = parseMailboxView(viewRaw);
    const where = mailboxViewWhere(userId, accountId, view, {
      unreadOnly: view === "inbox" && unreadOnly,
      search,
    });

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
          isSpam: true,
          isArchived: true,
          isStarred: true,
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
      view,
    };
  } catch (error) {
    console.error("[getMailboxEmails] Error:", error);
    return { emails: [], total: 0, page: 1, totalPages: 0, view: "inbox" as MailboxView };
  }
}

export type MailboxCounts = {
  inboxUnread: number;
  inboxTotal: number;
  starred: number;
  spam: number;
  archive: number;
  trash: number;
};

export async function getMailboxCounts(accountId: string): Promise<MailboxCounts> {
  try {
    const userId = await requireSession();
    const base = { userId, emailAccountId: accountId };

    const [inboxUnread, inboxTotal, starred, spam, archive, trash] = await Promise.all([
      prismadb.email.count({
        where: {
          ...base,
          folder: EmailFolder.INBOX,
          isRead: false,
          isDeleted: false,
          isSpam: false,
          isArchived: false,
        },
      }),
      prismadb.email.count({
        where: {
          ...base,
          folder: EmailFolder.INBOX,
          isDeleted: false,
          isSpam: false,
          isArchived: false,
        },
      }),
      prismadb.email.count({
        where: { ...base, isStarred: true, isDeleted: false, isSpam: false },
      }),
      prismadb.email.count({ where: { ...base, isSpam: true, isDeleted: false } }),
      prismadb.email.count({
        where: { ...base, isArchived: true, isDeleted: false, isSpam: false },
      }),
      prismadb.email.count({ where: { ...base, isDeleted: true } }),
    ]);

    return { inboxUnread, inboxTotal, starred, spam, archive, trash };
  } catch {
    return { inboxUnread: 0, inboxTotal: 0, starred: 0, spam: 0, archive: 0, trash: 0 };
  }
}

export async function setEmailStarred(id: string, isStarred: boolean) {
  const userId = await requireSession();
  await ownedEmail(id, userId);
  await prismadb.email.update({ where: { id }, data: { isStarred } });
}

async function bulkOwned(ids: string[], userId: string) {
  if (!ids.length) return;
  const rows = await prismadb.email.findMany({
    where: { id: { in: ids }, userId },
    select: { id: true },
  });
  if (rows.length !== ids.length) throw new Error("Not found");
}

export async function bulkSetRead(ids: string[], isRead: boolean) {
  const userId = await requireSession();
  await bulkOwned(ids, userId);
  await prismadb.email.updateMany({ where: { id: { in: ids }, userId }, data: { isRead } });
}

export async function bulkTrash(ids: string[]) {
  const userId = await requireSession();
  await bulkOwned(ids, userId);
  await prismadb.email.updateMany({
    where: { id: { in: ids }, userId },
    data: { isDeleted: true, isSpam: false, isArchived: false },
  });
}

export async function setEmailRead(id: string, isRead: boolean) {
  const userId = await requireSession();
  await ownedEmail(id, userId);
  await prismadb.email.update({ where: { id }, data: { isRead } });
}

export async function moveEmailToSpam(id: string) {
  const userId = await requireSession();
  await ownedEmail(id, userId);
  await prismadb.email.update({
    where: { id },
    data: { isSpam: true, isArchived: false, isRead: true },
  });
}

export async function moveEmailFromSpam(id: string) {
  const userId = await requireSession();
  await ownedEmail(id, userId);
  await prismadb.email.update({
    where: { id },
    data: { isSpam: false, isRead: false },
  });
}

export async function archiveEmail(id: string) {
  const userId = await requireSession();
  await ownedEmail(id, userId);
  await prismadb.email.update({
    where: { id },
    data: { isArchived: true, isSpam: false },
  });
}

export async function unarchiveEmail(id: string) {
  const userId = await requireSession();
  await ownedEmail(id, userId);
  await prismadb.email.update({ where: { id }, data: { isArchived: false } });
}

export async function trashEmail(id: string) {
  const userId = await requireSession();
  await ownedEmail(id, userId);
  await prismadb.email.update({
    where: { id },
    data: { isDeleted: true, isSpam: false, isArchived: false },
  });
}

export async function restoreEmailFromTrash(id: string) {
  const userId = await requireSession();
  await ownedEmail(id, userId);
  await prismadb.email.update({ where: { id }, data: { isDeleted: false } });
}

export async function deleteEmailPermanent(id: string) {
  const userId = await requireSession();
  const email = await ownedEmail(id, userId);
  if (!email.isDeleted) throw new Error("Move to trash first");
  await prismadb.email.delete({ where: { id } });
}
