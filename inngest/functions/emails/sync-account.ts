import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { decrypt } from "@/lib/email-crypto";
import { EmailFolder } from "@prisma/client";
import Imap from "imap";
import { connectImap, fetchHeaders, type ParsedHeader } from "@/inngest/lib/imap-utils";

const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;

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
          : [["SINCE", new Date(Date.now() - SIX_MONTHS_MS)]];

      imap.search(criteria, (searchErr, uids) => {
        if (searchErr) return reject(searchErr);
        const validUids = uids ?? [];
        const highest = validUids.length > 0 ? Math.max(...validUids) : lastUid;
        imap.closeBox(() => resolve({ uids: validUids, highestUid: highest }));
      });
    });
  });
}

export const emailSyncAccount = inngest.createFunction(
  {
    id: "email-sync-account",
    name: "Email: Sync Account",
    triggers: [{ event: "email/sync-account" }],
  },
  async ({ event, step }) => {
    const { accountId } = event.data as { accountId: string };

    const account = await step.run("fetch-account", () =>
      prismadb.emailAccount.findUnique({ where: { id: accountId } })
    );
    if (!account) return { skipped: "account not found" };

    const password = decrypt(account.passwordEncrypted);
    const imapAccount = {
      username: account.username,
      password,
      imapHost: account.imapHost,
      imapPort: account.imapPort,
      imapSsl: account.imapSsl,
    };

    const sentFolder = account.sentFolderName || "Sent";

    // Step: search for new UIDs in both folders (fast — no body download)
    // Use separate IMAP connections per folder to avoid openBox/closeBox race conditions
    const { inboxUids, sentUids, newInboxHighest, newSentHighest } = await step.run(
      "search-uids",
      async () => {
        const [inbox, sent] = await Promise.all([
          connectImap(imapAccount).then(async (imap) => {
            try { return await searchFolder(imap, "INBOX", account.inboxLastUid ?? 0); }
            finally { imap.end(); }
          }),
          connectImap(imapAccount).then(async (imap) => {
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

    if (inboxUids.length === 0 && sentUids.length === 0) {
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
      const [inbox, sent] = await Promise.all([
        inboxUids.length > 0
          ? connectImap(imapAccount).then(async (imap) => {
              try {
                await new Promise<void>((res, rej) =>
                  imap.openBox("INBOX", true, (err) => err ? rej(err) : res())
                );
                return fetchHeaders(imap, inboxUids);
              } finally { imap.end(); }
            })
          : Promise.resolve([] as ParsedHeader[]),
        sentUids.length > 0
          ? connectImap(imapAccount).then(async (imap) => {
              try {
                await new Promise<void>((res, rej) =>
                  imap.openBox(sentFolder, true, (err) => err ? rej(err) : res())
                );
                return fetchHeaders(imap, sentUids);
              } finally { imap.end(); }
            })
          : Promise.resolve([] as ParsedHeader[]),
      ]);
      return { inboxHeaders: inbox, sentHeaders: sent };
    });

    // Step: upsert metadata to DB (no body), collect new IDs
    const insertedIds: string[] = await step.run("upsert-metadata", async () => {
      const ids: string[] = [];
      await prismadb.$transaction(async (tx) => {
        const allMessages = [
          ...inboxHeaders.map((m) => ({ ...m, folder: EmailFolder.INBOX })),
          ...sentHeaders.map((m) => ({ ...m, folder: EmailFolder.SENT })),
        ];

        for (const msg of allMessages) {
          const existing = await tx.email.findFirst({
            where: { emailAccountId: accountId, rfcMessageId: msg.rfcMessageId },
            select: { id: true },
          });
          if (!existing) {
            const created = await tx.email.create({
              data: {
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
                // bodyText and bodyHtml intentionally omitted (null)
              },
              select: { id: true },
            });
            ids.push(created.id);
          }
        }

        await tx.emailAccount.update({
          where: { id: accountId },
          data: {
            lastSyncedAt: new Date(),
            inboxLastUid: newInboxHighest,
            sentLastUid: newSentHighest,
          },
        });
      });
      return ids;
    });

    // Fan out link-crm for each new email — use step.sendEvent for deterministic replay
    if (insertedIds.length > 0) {
      await step.sendEvent(
        "fan-out-link-crm",
        insertedIds.map((id) => ({
          name: "email/link-crm" as const,
          data: { emailId: id },
        }))
      );
    }

    return { synced: inboxHeaders.length + sentHeaders.length, newMessages: insertedIds.length };
  }
);
