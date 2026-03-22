# Email Sync Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix email sync so it is fast and reliable for any mailbox size, and only embeds emails that are linked to CRM contacts/accounts.

**Architecture:** Sync fetches headers only (no bodies) and caps first-time import to the last 6 months. After sync, `link-crm` matches emails against CRM contacts/accounts — only matched emails get their body fetched from IMAP and then embedded. Unmatched emails (spam, newsletters, unrelated) are stored as metadata only and never embedded. When a user opens an email whose body hasn't been fetched yet, `getEmail()` fetches it lazily from IMAP and caches it.

**Tech Stack:** TypeScript, Inngest, `imap` npm package, `mailparser`, Prisma, Next.js server actions.

---

## Current flow (broken)

```
sync-account → [fetch ALL bodies in one step → hangs]
  └─► embed-email  ← fires after embed (backwards!)
        └─► link-crm
```

## New flow

```
sync-account (headers only, last 6 months on first import)
  └─► email/link-crm  per new email (from envelope, no body needed)
        ├─► if linked (CRM contact/account matched):
        │     fetch body via IMAP by UID → save to DB → emit email/embed-email
        └─► if not linked: skip (no body, no embed)

getEmail() (user opens email):
  └─► if bodyText + bodyHtml both null → fetch body from IMAP → cache → return
```

---

## File Map

| File | Change |
|---|---|
| `inngest/lib/imap-utils.ts` | **Create** — shared IMAP helpers: open box, fetch headers batch, fetch single body |
| `inngest/functions/emails/sync-account.ts` | **Modify** — headers only, 6-month cap on first sync, emit `link-crm` not `embed-email` |
| `inngest/functions/emails/link-crm.ts` | **Modify** — fetch body + emit `embed-email` when linked |
| `inngest/functions/emails/embed-email.ts` | **Modify** — remove the `link-crm` send at end (fixes backwards flow) |
| `actions/emails/messages.ts` | **Modify** — `getEmail()` lazy-fetches body from IMAP if null |

---

## Task 1: Create shared IMAP utilities

**Files:**
- Create: `inngest/lib/imap-utils.ts`

### Context

The current `sync-account.ts` has all IMAP logic inline. We need the same IMAP connection + fetch logic in `link-crm.ts` and `actions/emails/messages.ts`. Extract it into a shared utility.

This file needs three exported functions:
1. `connectImap(account)` — returns a connected `Imap` instance, resolves on `ready`
2. `fetchHeaders(imap, folderName, uids)` — fetches `HEADER` for an array of UIDs, returns parsed envelope fields
3. `fetchBodyByUid(account, folderName, uid)` — opens a fresh IMAP connection, fetches full body for one UID, returns `{ bodyText, bodyHtml }`

`account` is the Prisma `EmailAccount` record (with `passwordEncrypted` already decrypted by caller, so pass `password: string` separately).

- [ ] **Step 1: Create `inngest/lib/imap-utils.ts`**

```typescript
import Imap from "imap";
import { simpleParser } from "mailparser";

export type ImapAccount = {
  username: string;
  password: string;
  imapHost: string;
  imapPort: number;
  imapSsl: boolean;
};

export type ParsedHeader = {
  uid: number;
  rfcMessageId: string;
  subject?: string;
  fromName?: string;
  fromEmail?: string;
  to: { name?: string; email: string }[];
  cc: { name?: string; email: string }[];
  sentAt?: Date;
};

/** Open a connection and resolve when ready. Caller is responsible for imap.end(). */
export function connectImap(account: ImapAccount): Promise<Imap> {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: account.username,
      password: account.password,
      host: account.imapHost,
      port: account.imapPort,
      tls: account.imapSsl,
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 15000,
      connTimeout: 15000,
    });
    imap.once("ready", () => resolve(imap));
    imap.once("error", reject);
    imap.connect();
  });
}

/** Fetch parsed headers for a list of UIDs from an already-open box. */
export function fetchHeaders(
  imap: Imap,
  uids: number[]
): Promise<ParsedHeader[]> {
  return new Promise((resolve, reject) => {
    const results: ParsedHeader[] = [];
    const pending: Promise<void>[] = [];

    const fetch = imap.fetch(uids, { bodies: "HEADER" });

    fetch.on("message", (msg) => {
      let uid = 0;
      const chunks: Buffer[] = [];

      msg.on("attributes", (attrs) => { uid = attrs.uid; });
      msg.on("body", (stream) => {
        stream.on("data", (chunk: Buffer) => chunks.push(chunk));
      });
      msg.on("end", () => {
        pending.push(
          (async () => {
            try {
              const parsed = await simpleParser(Buffer.concat(chunks));
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const toArr = (parsed.to as any)?.value ?? [];
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const ccArr = (parsed.cc as any)?.value ?? [];
              results.push({
                uid,
                rfcMessageId: parsed.messageId ?? `${uid}-header@local`,
                subject: parsed.subject,
                fromName: parsed.from?.value[0]?.name || undefined,
                fromEmail: parsed.from?.value[0]?.address || undefined,
                to: toArr.map((a: { name?: string; address?: string }) => ({
                  name: a.name,
                  email: a.address ?? "",
                })),
                cc: ccArr.map((a: { name?: string; address?: string }) => ({
                  name: a.name,
                  email: a.address ?? "",
                })),
                sentAt: parsed.date || undefined,
              });
            } catch {
              // skip unparseable header
            }
          })()
        );
      });
    });

    fetch.on("error", reject);
    fetch.on("end", () => {
      Promise.all(pending).then(() => resolve(results)).catch(reject);
    });
  });
}

/** Open a fresh IMAP connection, fetch the full body of one message by UID. */
export async function fetchBodyByUid(
  account: ImapAccount,
  folderName: string,
  uid: number
): Promise<{ bodyText?: string; bodyHtml?: string }> {
  const imap = await connectImap(account);

  return new Promise((resolve, reject) => {
    // Guard against double imap.end() calls across async paths
    let ended = false;
    const end = () => { if (!ended) { ended = true; imap.end(); } };

    imap.openBox(folderName, true, (err) => {
      if (err) { end(); return reject(err); }

      const fetch = imap.fetch([uid], { bodies: "" });
      const chunks: Buffer[] = [];
      let found = false;

      fetch.on("message", (msg) => {
        found = true;
        msg.on("body", (stream) => {
          stream.on("data", (chunk: Buffer) => chunks.push(chunk));
        });
        msg.on("end", () => {
          simpleParser(Buffer.concat(chunks))
            .then((parsed) => {
              end();
              resolve({
                bodyText: parsed.text || undefined,
                bodyHtml: parsed.html || undefined,
              });
            })
            .catch((e) => { end(); reject(e); });
        });
      });

      fetch.on("error", (e) => { end(); reject(e); });
      fetch.on("end", () => {
        if (!found) { end(); resolve({}); }
      });
    });
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add inngest/lib/imap-utils.ts
git commit -m "feat: extract shared IMAP utilities (connectImap, fetchHeaders, fetchBodyByUid)"
```

---

## Task 2: Rewrite sync-account to fetch headers only

**Files:**
- Modify: `inngest/functions/emails/sync-account.ts`

### Context

Current sync fetches full bodies (`bodies: ""`), times out on large mailboxes, and emits `email/embed-email` after sync. New sync:
- Uses `connectImap` + `fetchHeaders` from `imap-utils.ts`
- Caps first-time sync (lastUid = 0) to emails from the last 6 months using IMAP `SINCE` criterion
- Stores emails with `bodyText: null, bodyHtml: null`
- Emits `email/link-crm` (not `email/embed-email`) for each new email

The `fetchFolder` helper is replaced by two steps: open box → search UIDs → fetch headers.

- [ ] **Step 1: Rewrite `sync-account.ts`**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add inngest/functions/emails/sync-account.ts
git commit -m "feat: sync headers only with 6-month initial cap, emit link-crm instead of embed-email"
```

---

## Task 3: Extend link-crm to fetch body and trigger embedding for matched emails

**Files:**
- Modify: `inngest/functions/emails/link-crm.ts`

### Context

Currently `link-crm` matches email addresses against CRM contacts/accounts and creates join records. It returns early if nothing matches.

New behaviour: after creating links, if `linked > 0`, fetch the full body for that email via IMAP using `fetchBodyByUid`, save `bodyText` and `bodyHtml` to the DB, then emit `email/embed-email`. If nothing matched, return early as before — no body fetch, no embed.

The function needs to load the `emailAccount` (for IMAP credentials) and the email's `imapUid` + `folder`.

- [ ] **Step 1: Rewrite `link-crm.ts`**

```typescript
import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { decrypt } from "@/lib/email-crypto";
import { fetchBodyByUid } from "@/inngest/lib/imap-utils";

export const emailLinkCrm = inngest.createFunction(
  {
    id: "email-link-crm",
    name: "Email: Link to CRM",
    triggers: [{ event: "email/link-crm" }],
  },
  async ({ event, step }: { event: { data: { emailId: string } }; step: any }) => {
    const { emailId } = event.data;

    const email = await prismadb.email.findUnique({
      where: { id: emailId },
      select: {
        fromEmail: true,
        toRecipients: true,
        ccRecipients: true,
        imapUid: true,
        folder: true,
        emailAccountId: true,
      },
    });
    if (!email) return { skipped: "not found" };

    // Collect all addresses (exclude BCC — privacy)
    const addresses = [
      email.fromEmail,
      ...(email.toRecipients as { email?: string }[]).map((r) => r.email),
      ...(email.ccRecipients as { email?: string }[]).map((r) => r.email),
    ]
      .filter((e): e is string => typeof e === "string" && e.length > 0)
      .map((e) => e.toLowerCase());

    if (addresses.length === 0) return { linked: 0 };

    const linked = await step.run("match-and-link", async () => {
      const [contacts, accounts] = await Promise.all([
        prismadb.crm_Contacts.findMany({
          where: { email: { in: addresses } },
          select: { id: true },
        }),
        prismadb.crm_Accounts.findMany({
          where: { email: { in: addresses } },
          select: { id: true },
        }),
      ]);

      const contactLinks = contacts.map((c) => ({ emailId, contactId: c.id }));
      const accountLinks = accounts.map((a) => ({ emailId, accountId: a.id }));

      await Promise.all([
        contactLinks.length > 0 &&
          prismadb.emailsToContacts.createMany({ data: contactLinks, skipDuplicates: true }),
        accountLinks.length > 0 &&
          prismadb.emailsToAccounts.createMany({ data: accountLinks, skipDuplicates: true }),
      ]);

      return contactLinks.length + accountLinks.length;
    });

    // Only fetch body + embed for emails that are CRM-relevant
    if (linked > 0 && email.imapUid) {
      const emailAccount = await prismadb.emailAccount.findUnique({
        where: { id: email.emailAccountId },
        select: {
          username: true,
          passwordEncrypted: true,
          imapHost: true,
          imapPort: true,
          imapSsl: true,
          sentFolderName: true,
        },
      });

      if (emailAccount) {
        const folderName =
          email.folder === "SENT"
            ? (emailAccount.sentFolderName || "Sent")
            : "INBOX";

        // Wrap body fetch in step.run for idempotent retry behaviour
        await step.run("fetch-and-save-body", async () => {
          try {
            const body = await fetchBodyByUid(
              {
                username: emailAccount.username,
                password: decrypt(emailAccount.passwordEncrypted),
                imapHost: emailAccount.imapHost,
                imapPort: emailAccount.imapPort,
                imapSsl: emailAccount.imapSsl,
              },
              folderName,
              email.imapUid!
            );

            await prismadb.email.update({
              where: { id: emailId },
              data: {
                bodyText: body.bodyText ?? null,
                bodyHtml: body.bodyHtml ?? null,
              },
            });
          } catch {
            // Body fetch failed — embed will run with subject-only text
          }
        });

        await step.sendEvent("trigger-embed", {
          name: "email/embed-email",
          data: { emailId },
        });
      }
    }

    return { linked };
  }
);
```

- [ ] **Step 2: Commit**

```bash
git add inngest/functions/emails/link-crm.ts
git commit -m "feat: link-crm fetches body and triggers embed only for CRM-linked emails"
```

---

## Task 4: Fix embed-email (remove backwards link-crm send)

**Files:**
- Modify: `inngest/functions/emails/embed-email.ts`

### Context

Currently `embed-email` sends `email/link-crm` at the end, which is the wrong direction — link-crm is now the _trigger_ for embed-email, not the result. Remove those 5 lines. No other changes needed; the rest of the function (hash check, embedding, upsert) is correct.

- [ ] **Step 1: Remove the `link-crm` send from `embed-email.ts`**

Remove this block at the end of the function (after the `$executeRaw` upsert):

```typescript
    await inngest.send({
      name: "email/link-crm",
      data: { emailId },
    });
```

The function should end with:

```typescript
    return { embedded: true, emailId };
```

- [ ] **Step 2: Commit**

```bash
git add inngest/functions/emails/embed-email.ts
git commit -m "fix: remove backwards link-crm send from embed-email"
```

---

## Task 5: Lazy body fetch in getEmail()

**Files:**
- Modify: `actions/emails/messages.ts`

### Context

When a user opens an email whose body hasn't been fetched yet (because it wasn't CRM-linked at sync time), `getEmail()` should fetch the body from IMAP on demand, save it to the DB, and return it. This makes the display work for all emails, not just CRM-linked ones.

After fetching and saving the body, also emit `email/embed-email` — this gives the user a chance to retroactively embed emails they find relevant enough to open. (Optional: only emit embed if the email is already linked to CRM — your call, see note below.)

**Note on embed on open:** Emitting embed for every opened email regardless of CRM link would gradually embed the whole mailbox as the user browses. Since the user explicitly wants to avoid that expense, only emit embed if the email already has CRM links.

- [ ] **Step 1: Modify `getEmail()` in `actions/emails/messages.ts`**

Add the lazy fetch after the `findFirst` call. The updated function body (replace from the `findFirst` call onwards):

```typescript
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

  // Lazy body fetch — only needed for emails synced before the overhaul
  // or emails not yet CRM-linked (body intentionally null after metadata-only sync)
  if (!email.bodyText && !email.bodyHtml && email.imapUid) {
    try {
      const account = await prismadb.emailAccount.findUnique({
        where: { id: email.emailAccountId },
        select: {
          username: true,
          passwordEncrypted: true,
          imapHost: true,
          imapPort: true,
          imapSsl: true,
          sentFolderName: true,
        },
      });

      if (account) {
        const { fetchBodyByUid } = await import("@/inngest/lib/imap-utils");
        const folderName = email.folder === "SENT" ? (account.sentFolderName || "Sent") : "INBOX";
        const body = await fetchBodyByUid(
          {
            username: account.username,
            password: decrypt(account.passwordEncrypted),
            imapHost: account.imapHost,
            imapPort: account.imapPort,
            imapSsl: account.imapSsl,
          },
          folderName,
          email.imapUid
        );

        if (body.bodyText || body.bodyHtml) {
          await prismadb.email.update({
            where: { id },
            data: { bodyText: body.bodyText ?? null, bodyHtml: body.bodyHtml ?? null },
          });
          // Trigger embed only if already CRM-linked (avoids embedding unrelated emails)
          const isLinked = email.contacts.length > 0 || email.accounts.length > 0;
          if (isLinked) {
            const { inngest } = await import("@/inngest/client");
            await inngest.send({ name: "email/embed-email", data: { emailId: id } });
          }
          // Patch the in-memory object so the caller gets the body immediately
          email.bodyText = body.bodyText ?? null;
          email.bodyHtml = body.bodyHtml ?? null;
        }
      }
    } catch {
      // Body fetch failed — return email without body; display will show a fallback
    }
  }

  // Mark as read (fire-and-forget)
  if (!email.isRead) {
    prismadb.email.update({ where: { id }, data: { isRead: true } }).catch(() => {});
  }

  return email;
}
```

Note: `decrypt` is already imported at the top of `messages.ts`. The dynamic imports of `imap-utils` and `inngest/client` avoid importing IMAP (a Node.js-only module) at the module level in a server action file (safe in Next.js, but cleaner this way).

- [ ] **Step 2: Commit**

```bash
git add actions/emails/messages.ts
git commit -m "feat: lazy-fetch email body from IMAP when null, embed if CRM-linked"
```

---

## Task 6: Manual smoke test

- [ ] **Step 1: Trigger a sync via Inngest dev UI or MCP**

Send event `email/sync-account` with `{ "accountId": "<your-account-id>" }`.

Expected: run completes quickly (seconds, not minutes). Steps visible: `fetch-account`, `search-uids`, `fetch-headers`, `upsert-metadata`.

- [ ] **Step 2: Check DB has email records with null bodies**

```sql
SELECT id, subject, "fromEmail", "bodyText", "bodyHtml", "imapUid"
FROM "Email"
LIMIT 10;
```

Expected: rows with real `subject`/`fromEmail`, and `bodyText`/`bodyHtml` = null.

- [ ] **Step 3: Check link-crm ran for each email**

In Inngest dev UI, check `email/link-crm` runs. For emails that matched CRM contacts, verify `email/embed-email` also ran.

- [ ] **Step 4: Open an email in the UI**

Navigate to `/emails`, pick an account, click an email. Expected: body renders (lazy fetch). Check DB to confirm `bodyText` is now populated for that email.
