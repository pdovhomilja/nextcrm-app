import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { decrypt } from "@/lib/email-crypto";
import { EmailFolder, EmailSendProvider } from "@prisma/client";
import Imap from "imap";
import { connectImap, fetchHeaders, type ParsedHeader } from "@/inngest/lib/imap-utils";
import {
  capImapUids,
  EMAIL_FIRST_SYNC_SINCE_MS,
  EMAIL_INITIAL_IMPORT_MAX,
  EMAIL_SYNC_BATCH_MAX,
} from "@/lib/email/sync-limits";

const LINK_CRM_FANOUT_CHUNK = 40;

async function searchFolder(
  imap: Imap,
  folderName: string,
  lastUid: number
): Promise<{ uids: number[]; highestUid: number }> {
  return new Promise((resolve, reject) => {
    imap.openBox(folderName, true, (err) => {
      if (err) return reject(err);

      const criteria: unknown[] =
        lastUid > 0
          ? [["UID", `${lastUid + 1}:*`]]
          : [["SINCE", new Date(Date.now() - EMAIL_FIRST_SYNC_SINCE_MS)]];

      imap.search(criteria, (searchErr, uids) => {
        if (searchErr) return reject(searchErr);
        const validUids = uids ?? [];
        const highest = validUids.length > 0 ? validUids.reduce((a, b) => Math.max(a, b), lastUid) : lastUid;
        imap.closeBox(() => resolve({ uids: validUids, highestUid: highest }));
      });
    });
  });
}

export const emailSyncAccount = inngest.createFunction(
  {
    id: "email-sync-account",
    name: "Email: Sync Account",
    concurrency: { limit: 3 },
    triggers: [{ event: "email/sync-account" }],
  },
  async ({ event, step }) => {
    const { accountId } = event.data as { accountId: string };

    const account = await step.run("fetch-account", () =>
      prismadb.emailAccount.findUnique({ where: { id: accountId } })
    );
    if (!account) return { skipped: "account not found" };
    if (account.sendProvider === EmailSendProvider.RESEND) {
      return { skipped: "Resend send-only mailbox" };
    }
    const encryptedPassword = account.passwordEncrypted;
    if (!encryptedPassword) {
      return { skipped: "no mailbox credentials" };
    }

    const sentFolder = account.sentFolderName || "Sent";

    // Step: search for new UIDs in both folders (fast — no body download)
    // Use separate IMAP connections per folder to avoid openBox/closeBox race conditions
    const { inboxUids, sentUids, newInboxHighest, newSentHighest } = await step.run(
      "search-uids",
      async () => {
        const pwd = decrypt(encryptedPassword);
        const acc = { username: account.username, password: pwd, imapHost: account.imapHost, imapPort: account.imapPort, imapSsl: account.imapSsl, allowSelfSignedTls: account.allowSelfSignedTls };
        const [inbox, sent] = await Promise.all([
          connectImap(acc).then(async (imap) => {
            try { return await searchFolder(imap, "INBOX", account.inboxLastUid ?? 0); }
            finally { imap.end(); }
          }),
          connectImap(acc).then(async (imap) => {
            try { return await searchFolder(imap, sentFolder, account.sentLastUid ?? 0); }
            finally { imap.end(); }
          }),
        ]);
        return {
          inboxUids: inbox.uids,
          sentUids: sent.uids,
          newInboxHighest: inbox.highestUid,
          newSentHighest: sent.highestUid,
        };
      }
    );

    const inboxLast = account.inboxLastUid ?? 0;
    const sentLast = account.sentLastUid ?? 0;
    const inboxCap = capImapUids(
      inboxUids,
      inboxLast,
      inboxLast === 0 ? EMAIL_INITIAL_IMPORT_MAX : EMAIL_SYNC_BATCH_MAX
    );
    const sentCap = capImapUids(
      sentUids,
      sentLast,
      sentLast === 0 ? EMAIL_INITIAL_IMPORT_MAX : EMAIL_SYNC_BATCH_MAX
    );

    if (inboxCap.length === 0 && sentCap.length === 0) {
      await step.run("update-synced-at", () =>
        prismadb.emailAccount.update({
          where: { id: accountId },
          data: { lastSyncedAt: new Date() },
        })
      );
      return { synced: 0, newMessages: 0 };
    }

    // Step: fetch headers only — separate connections per folder to avoid box-state conflicts
    const { inboxHeaders, sentHeaders } = await step.run("fetch-headers", async () => {
      const pwd = decrypt(encryptedPassword);
      const acc = { username: account.username, password: pwd, imapHost: account.imapHost, imapPort: account.imapPort, imapSsl: account.imapSsl, allowSelfSignedTls: account.allowSelfSignedTls };
      const [inbox, sent] = await Promise.all([
        inboxCap.length > 0
          ? connectImap(acc).then(async (imap) => {
              try {
                await new Promise<void>((res, rej) =>
                  imap.openBox("INBOX", true, (err) => err ? rej(err) : res())
                );
                return fetchHeaders(imap, inboxCap);
              } finally { imap.end(); }
            })
          : Promise.resolve([] as ParsedHeader[]),
        sentCap.length > 0
          ? connectImap(acc).then(async (imap) => {
              try {
                await new Promise<void>((res, rej) =>
                  imap.openBox(sentFolder, true, (err) => err ? rej(err) : res())
                );
                return fetchHeaders(imap, sentCap);
              } finally { imap.end(); }
            })
          : Promise.resolve([] as ParsedHeader[]),
      ]);
      return { inboxHeaders: inbox, sentHeaders: sent };
    });

    // Step: upsert metadata to DB (no body), collect new IDs
    // Uses batch queries instead of a per-message loop inside a transaction to avoid
    // interactive transaction timeout when syncing large mailboxes (e.g. Gmail initial sync).
    const insertedIds: string[] = await step.run("upsert-metadata", async () => {
      const allMessages = [
        ...inboxHeaders.map((m) => ({ ...m, folder: EmailFolder.INBOX })),
        ...sentHeaders.map((m) => ({ ...m, folder: EmailFolder.SENT })),
      ].filter((m) => !!m.rfcMessageId);

      if (allMessages.length === 0) {
        await prismadb.emailAccount.update({
          where: { id: accountId },
          data: {
            lastSyncedAt: new Date(),
            inboxLastUid:
              inboxCap.length > 0 ? Math.max(inboxLast, ...inboxCap) : newInboxHighest,
            sentLastUid: sentCap.length > 0 ? Math.max(sentLast, ...sentCap) : newSentHighest,
          },
        });
        return [];
      }

      // 1. Find which rfcMessageIds already exist (one query)
      const rfcIds = allMessages.map((m) => m.rfcMessageId);
      const existing = await prismadb.email.findMany({
        where: { emailAccountId: accountId, rfcMessageId: { in: rfcIds } },
        select: { rfcMessageId: true },
      });
      const existingSet = new Set(existing.map((e) => e.rfcMessageId));

      // 2. Filter to truly new messages
      const newMessages = allMessages.filter((m) => !existingSet.has(m.rfcMessageId));

      // 3. Bulk-insert new messages (one query); skipDuplicates is safe because of
      //    @@unique([emailAccountId, rfcMessageId]) on the Email model.
      if (newMessages.length > 0) {
        await prismadb.email.createMany({
          data: newMessages.map((msg) => ({
            emailAccountId: accountId,
            userId: account.userId,
            rfcMessageId: msg.rfcMessageId,
            imapUid: msg.uid,
            folder: msg.folder,
            subject: msg.subject,
            fromName: msg.fromName,
            fromEmail: msg.fromEmail,
            toRecipients: msg.to,
            ccRecipients: msg.cc,
            sentAt: msg.sentAt,
          })),
          skipDuplicates: true,
        });
      }

      // 4. Fetch IDs of newly inserted emails for fan-out (one query)
      const newIds =
        newMessages.length > 0
          ? await prismadb.email
              .findMany({
                where: { emailAccountId: accountId, rfcMessageId: { in: newMessages.map((m) => m.rfcMessageId) } },
                select: { id: true },
              })
              .then((rows) => rows.map((r) => r.id))
          : [];

      // 5. Update account watermarks (one query)
      await prismadb.emailAccount.update({
        where: { id: accountId },
        data: {
          lastSyncedAt: new Date(),
          inboxLastUid:
            inboxCap.length > 0 ? Math.max(inboxLast, ...inboxCap) : newInboxHighest,
          sentLastUid: sentCap.length > 0 ? Math.max(sentLast, ...sentCap) : newSentHighest,
        },
      });

      return newIds;
    });

    if (insertedIds.length > 0) {
      for (let i = 0; i < insertedIds.length; i += LINK_CRM_FANOUT_CHUNK) {
        const chunk = insertedIds.slice(i, i + LINK_CRM_FANOUT_CHUNK);
        await step.sendEvent(
          `fan-out-link-crm-${i}`,
          chunk.map((id) => ({
            name: "email/link-crm" as const,
            data: { emailId: id },
          }))
        );
      }
    }

    return { synced: inboxHeaders.length + sentHeaders.length, newMessages: insertedIds.length };
  }
);
