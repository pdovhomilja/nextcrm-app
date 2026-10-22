"use server";

import { getSession } from "@/lib/auth-server";
import { resolveMailboxAccess } from "@/lib/email/mailbox-access";
import { prismadb } from "@/lib/prisma";
import {
  mailboxViewWhere,
  parseMailboxView,
  type MailboxView,
} from "@/lib/email/mailbox-views";
import { MAILBOX_MAX_COUNT, MAILBOX_PAGE_SIZE } from "@/lib/email/mailbox-constants";
import {
  getCachedMailboxCounts,
  getCachedMailboxList,
  getMailboxCacheGeneration,
  invalidateMailboxCacheForEmail,
  invalidateMailboxCacheForEmails,
  setCachedMailboxCounts,
  setCachedMailboxList,
} from "@/lib/email/mailbox-cache";
import { EmailFolder } from "@prisma/client";
import { serializeDecimalsList } from "@/lib/serialize-decimals";
import type {
  MailboxCounts,
  MailboxEmailsResult,
  MailboxListItem,
} from "@/lib/email/mailbox-types";

async function requireSession() {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id as string;
}

async function ownedEmail(id: string, _sessionUserId: string) {
  const email = await prismadb.email.findFirst({ where: { id } });
  if (!email) throw new Error("Not found");
  await resolveMailboxAccess(email.emailAccountId);
  return email;
}

export async function getMailboxEmails(
  accountId: string,
  viewRaw: string | undefined,
  page: number,
  search?: string,
  unreadOnly?: boolean
): Promise<MailboxEmailsResult> {
  try {
    const sessionUserId = await requireSession();
    const access = await resolveMailboxAccess(accountId);
    const mailboxUserId = access.mailboxUserId;
    const view = parseMailboxView(viewRaw);
    const safePage = Math.max(1, page);
    const searchTerm = search?.trim();
    const cacheGen = await getMailboxCacheGeneration(sessionUserId, accountId);
    const cacheKey = {
      view,
      page: safePage,
      search: searchTerm ?? "",
      unreadOnly: Boolean(unreadOnly),
    };

    const cached = await getCachedMailboxList<MailboxEmailsResult>(
      sessionUserId,
      accountId,
      cacheGen,
      cacheKey
    );
    if (cached) return cached;

    const where = mailboxViewWhere(mailboxUserId, accountId, view, {
      unreadOnly: view === "inbox" && unreadOnly,
      search: searchTerm,
    });

    const [emails, rawCount] = await Promise.all([
      prismadb.email.findMany({
        where,
        orderBy: { sentAt: "desc" },
        skip: (safePage - 1) * MAILBOX_PAGE_SIZE,
        take: MAILBOX_PAGE_SIZE,
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

    const total = Math.min(rawCount, MAILBOX_MAX_COUNT);
    const result: MailboxEmailsResult = {
      emails: serializeDecimalsList<MailboxListItem>(emails),
      total,
      page: safePage,
      totalPages: total === 0 ? 0 : Math.ceil(total / MAILBOX_PAGE_SIZE),
      view,
    };
    await setCachedMailboxList(sessionUserId, accountId, cacheGen, cacheKey, result);
    return result;
  } catch (error) {
    console.error("[getMailboxEmails] Error:", error);
    return { emails: [], total: 0, page: 1, totalPages: 1, view: "inbox" as MailboxView };
  }
}

export async function getMailboxCounts(accountId: string): Promise<MailboxCounts> {
  try {
    const sessionUserId = await requireSession();
    const access = await resolveMailboxAccess(accountId);
    const cached = await getCachedMailboxCounts<MailboxCounts>(sessionUserId, accountId);
    if (cached) return cached;

    const base = { userId: access.mailboxUserId, emailAccountId: accountId };

    const [row] = await prismadb.$queryRaw<
      [
        {
          inbox_unread: bigint;
          inbox_total: bigint;
          starred: bigint;
          spam: bigint;
          archive: bigint;
          trash: bigint;
        },
      ]
    >`
      SELECT
        COUNT(*) FILTER (
          WHERE folder = 'INBOX'::"EmailFolder"
            AND NOT "isRead"
            AND NOT "isDeleted"
            AND NOT "isSpam"
            AND NOT "isArchived"
        ) AS inbox_unread,
        COUNT(*) FILTER (
          WHERE folder = 'INBOX'::"EmailFolder"
            AND NOT "isDeleted"
            AND NOT "isSpam"
            AND NOT "isArchived"
        ) AS inbox_total,
        COUNT(*) FILTER (
          WHERE "isStarred" AND NOT "isDeleted" AND NOT "isSpam"
        ) AS starred,
        COUNT(*) FILTER (WHERE "isSpam" AND NOT "isDeleted") AS spam,
        COUNT(*) FILTER (
          WHERE "isArchived" AND NOT "isDeleted" AND NOT "isSpam"
        ) AS archive,
        COUNT(*) FILTER (WHERE "isDeleted") AS trash
      FROM "Email"
      WHERE "userId" = ${access.mailboxUserId}::uuid
        AND "emailAccountId" = ${accountId}::uuid
    `;

    const counts = {
      inboxUnread: Number(row?.inbox_unread ?? 0),
      inboxTotal: Number(row?.inbox_total ?? 0),
      starred: Number(row?.starred ?? 0),
      spam: Number(row?.spam ?? 0),
      archive: Number(row?.archive ?? 0),
      trash: Number(row?.trash ?? 0),
    };
    await setCachedMailboxCounts(sessionUserId, accountId, counts);
    return counts;
  } catch {
    return { inboxUnread: 0, inboxTotal: 0, starred: 0, spam: 0, archive: 0, trash: 0 };
  }
}

export async function setEmailStarred(id: string, isStarred: boolean) {
  const userId = await requireSession();
  await ownedEmail(id, userId);
  await prismadb.email.update({ where: { id }, data: { isStarred } });
  await invalidateMailboxCacheForEmail(id, userId);
}

async function bulkOwned(ids: string[], sessionUserId: string) {
  if (!ids.length) return;
  const rows = await prismadb.email.findMany({
    where: { id: { in: ids } },
    select: { id: true, emailAccountId: true },
  });
  if (rows.length !== ids.length) throw new Error("Not found");
  const accountIds = Array.from(new Set(rows.map((r) => r.emailAccountId)));
  await Promise.all(accountIds.map((accountId) => resolveMailboxAccess(accountId)));
}

export async function bulkSetRead(ids: string[], isRead: boolean) {
  const userId = await requireSession();
  await bulkOwned(ids, userId);
  await prismadb.email.updateMany({ where: { id: { in: ids } }, data: { isRead } });
  await invalidateMailboxCacheForEmails(ids, userId);
}

export async function bulkTrash(ids: string[]) {
  const userId = await requireSession();
  await bulkOwned(ids, userId);
  await prismadb.email.updateMany({
    where: { id: { in: ids } },
    data: { isDeleted: true, isSpam: false, isArchived: false },
  });
  await invalidateMailboxCacheForEmails(ids, userId);
}

export async function setEmailRead(id: string, isRead: boolean) {
  const userId = await requireSession();
  await ownedEmail(id, userId);
  await prismadb.email.update({ where: { id }, data: { isRead } });
  await invalidateMailboxCacheForEmail(id, userId);
}

export async function moveEmailToSpam(id: string) {
  const userId = await requireSession();
  await ownedEmail(id, userId);
  await prismadb.email.update({
    where: { id },
    data: { isSpam: true, isArchived: false, isRead: true },
  });
  await invalidateMailboxCacheForEmail(id, userId);
}

export async function moveEmailFromSpam(id: string) {
  const userId = await requireSession();
  await ownedEmail(id, userId);
  await prismadb.email.update({
    where: { id },
    data: { isSpam: false, isRead: false },
  });
  await invalidateMailboxCacheForEmail(id, userId);
}

export async function archiveEmail(id: string) {
  const userId = await requireSession();
  await ownedEmail(id, userId);
  await prismadb.email.update({
    where: { id },
    data: { isArchived: true, isSpam: false },
  });
  await invalidateMailboxCacheForEmail(id, userId);
}

export async function unarchiveEmail(id: string) {
  const userId = await requireSession();
  await ownedEmail(id, userId);
  await prismadb.email.update({ where: { id }, data: { isArchived: false } });
  await invalidateMailboxCacheForEmail(id, userId);
}

export async function trashEmail(id: string) {
  const userId = await requireSession();
  await ownedEmail(id, userId);
  await prismadb.email.update({
    where: { id },
    data: { isDeleted: true, isSpam: false, isArchived: false },
  });
  await invalidateMailboxCacheForEmail(id, userId);
}

export async function restoreEmailFromTrash(id: string) {
  const userId = await requireSession();
  await ownedEmail(id, userId);
  await prismadb.email.update({ where: { id }, data: { isDeleted: false } });
  await invalidateMailboxCacheForEmail(id, userId);
}

export async function deleteEmailPermanent(id: string) {
  const userId = await requireSession();
  const email = await ownedEmail(id, userId);
  if (!email.isDeleted) throw new Error("Move to trash first");
  await prismadb.email.delete({ where: { id } });
  await invalidateMailboxCacheForEmail(id, userId);
}
