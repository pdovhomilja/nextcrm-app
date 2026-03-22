import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { decrypt } from "@/lib/email-crypto";
import { EmailFolder } from "@prisma/client";
import Imap from "imap";
import { simpleParser } from "mailparser";

type ParsedMessage = {
  uid: number;
  rfcMessageId: string;
  subject?: string;
  fromName?: string;
  fromEmail?: string;
  to: { name?: string; email: string }[];
  cc: { name?: string; email: string }[];
  bodyText?: string;
  bodyHtml?: string;
  sentAt?: Date;
};

type ParsedMessageWithFolder = ParsedMessage & { folder: EmailFolder };

async function fetchFolder(
  imap: Imap,
  folder: string,
  lastUid: number
): Promise<ParsedMessage[]> {
  return new Promise((resolve, reject) => {
    const messages: ParsedMessage[] = [];
    const pendingParses: Promise<void>[] = [];

    imap.openBox(folder, true, (err) => {
      if (err) return reject(err);

      const criteria = lastUid > 0 ? [["UID", `${lastUid + 1}:*`]] : ["ALL"];
      imap.search(criteria, (searchErr, uids) => {
        if (searchErr) return reject(searchErr);
        if (!uids || uids.length === 0) {
          imap.closeBox(() => resolve(messages));
          return;
        }

        const fetch = imap.fetch(uids, { bodies: "" });
        fetch.on("message", (msg) => {
          let uid = 0;
          const chunks: Buffer[] = [];

          msg.on("attributes", (attrs) => { uid = attrs.uid; });
          msg.on("body", (stream) => {
            stream.on("data", (chunk: Buffer) => chunks.push(chunk));
          });
          msg.on("end", () => {
            const parsePromise = (async () => {
              try {
                const raw = Buffer.concat(chunks);
                const parsed = await simpleParser(raw);
                const rfcMessageId = parsed.messageId ?? `${uid}-${folder}@local`;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const toArr = (parsed.to as any)?.value ?? [];
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const ccArr = (parsed.cc as any)?.value ?? [];
                messages.push({
                  uid,
                  rfcMessageId,
                  subject: parsed.subject,
                  fromName: parsed.from?.value[0]?.name || undefined,
                  fromEmail: parsed.from?.value[0]?.address || undefined,
                  to: toArr.map((a: { name?: string; address?: string }) => ({ name: a.name, email: a.address ?? "" })),
                  cc: ccArr.map((a: { name?: string; address?: string }) => ({ name: a.name, email: a.address ?? "" })),
                  bodyText: parsed.text || undefined,
                  bodyHtml: parsed.html || undefined,
                  sentAt: parsed.date || undefined,
                });
              } catch {
                // skip unparseable message
              }
            })();
            pendingParses.push(parsePromise);
          });
        });

        fetch.on("error", reject);
        fetch.on("end", () => {
          Promise.all(pendingParses).then(() => {
            imap.closeBox(() => resolve(messages));
          }).catch(reject);
        });
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
  async ({ event, step }: { event: { data: { accountId: string } }; step: { run: <T>(name: string, fn: () => Promise<T> | T) => Promise<T> } }) => {
    const { accountId } = event.data;

    const account = await step.run("fetch-account", () =>
      prismadb.emailAccount.findUnique({ where: { id: accountId } })
    );
    if (!account) return { skipped: "account not found" };

    const password = decrypt(account.passwordEncrypted);

    const [inboxMessages, sentMessages] = await step.run("fetch-imap", () =>
      new Promise<[ParsedMessage[], ParsedMessage[]]>((resolve, reject) => {
        const imap = new Imap({
          user: account.username,
          password,
          host: account.imapHost,
          port: account.imapPort,
          tls: account.imapSsl,
          tlsOptions: { rejectUnauthorized: false },
          authTimeout: 15000,
          connTimeout: 15000,
        });

        imap.once("ready", async () => {
          try {
            const inbox = await fetchFolder(imap, "INBOX", account.inboxLastUid ?? 0);
            const sent = await fetchFolder(imap, account.sentFolderName, account.sentLastUid ?? 0);
            imap.end();
            resolve([inbox, sent]);
          } catch (err) {
            imap.end();
            reject(err);
          }
        });
        imap.once("error", reject);
        imap.connect();
      })
    );

    const newInboxUid = inboxMessages.reduce((m: number, msg: ParsedMessage) => Math.max(m, msg.uid), account.inboxLastUid ?? 0);
    const newSentUid = sentMessages.reduce((m: number, msg: ParsedMessage) => Math.max(m, msg.uid), account.sentLastUid ?? 0);

    const allMessages: ParsedMessageWithFolder[] = [
      ...inboxMessages.map((m: ParsedMessage) => ({ ...m, folder: EmailFolder.INBOX })),
      ...sentMessages.map((m: ParsedMessage) => ({ ...m, folder: EmailFolder.SENT })),
    ];

    const insertedIds: string[] = await step.run("upsert-emails", async () => {
      const ids: string[] = [];
      await prismadb.$transaction(async (tx) => {
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
                bodyText: msg.bodyText,
                bodyHtml: msg.bodyHtml,
                sentAt: msg.sentAt,
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
            inboxLastUid: newInboxUid,
            sentLastUid: newSentUid,
          },
        });
      });
      return ids;
    });

    if (insertedIds.length > 0) {
      await inngest.send(
        insertedIds.map((id) => ({
          name: "email/embed-email" as const,
          data: { emailId: id },
        }))
      );
    }

    return { synced: allMessages.length, newMessages: insertedIds.length };
  }
);
