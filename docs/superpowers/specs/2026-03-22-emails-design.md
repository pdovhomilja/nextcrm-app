# Emails Feature — Design Spec

**Date:** 2026-03-22
**Status:** Approved
**Author:** Brainstorming session

---

## Overview

Add a full email client experience to NextCRM. Users connect one or more IMAP mailboxes via `/profile`, then read, compose, reply, forward, delete, and search emails at `/emails`. Emails are synced into PostgreSQL via Inngest (scheduled + on-demand), embedded with OpenAI vectors for semantic search, and auto-linked to CRM records.

---

## Scope

**In scope:**
- IMAP account management (add, delete, test) under `/profile`
- Multi-account support per user
- Email sync: Inbox + Sent folders only
- Email actions: compose, send, reply, forward, delete, read, search
- Semantic search via pgvector embeddings
- Auto-linking emails to CRM contacts and accounts
- Scheduled sync (every 15 min) + manual on-demand sync

**Out of scope:**
- Draft saving
- Spam / Trash / custom folder sync
- Push/IMAP IDLE (real-time sync)
- Attachment management
- Email labelling / tagging
- Edit email account credentials after creation (v2)

---

## Architecture

**Approach:** Full DB Mirror (Option A)

All email content is synced into PostgreSQL. The UI reads exclusively from the DB — IMAP is never queried at read time. Inngest handles all background sync. This enables fast UI, semantic search, and CRM linking.

---

## Data Models

### `EmailAccount`
Stores IMAP/SMTP credentials per user. Multiple accounts per user are supported.

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| userId | UUID | FK → Users, indexed |
| label | String | Display name (e.g. "Work Gmail") |
| imapHost | String | |
| imapPort | Int | |
| imapSsl | Boolean | |
| smtpHost | String | |
| smtpPort | Int | |
| smtpSsl | Boolean | |
| username | String | |
| passwordEncrypted | String | AES-256-GCM encrypted |
| isActive | Boolean | default true |
| lastSyncedAt | DateTime? | Timestamp of last completed sync |
| inboxLastUid | Int? | Highest IMAP UID seen in INBOX (sync cursor) |
| sentLastUid | Int? | Highest IMAP UID seen in SENT (sync cursor) |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### `Email`
Synced email messages. Stores Inbox and Sent messages.

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| emailAccountId | UUID | FK → EmailAccount |
| userId | UUID | FK → Users, indexed (fast ownership filtering) |
| rfcMessageId | String | RFC 822 `Message-ID` header — stable global identifier. If the header is absent (malformed/legacy messages), synthesize a fallback: `<emailAccountId>-<folder>-<imapUid>@local`. The unique constraint still holds. |
| imapUid | Int? | IMAP UID (folder-scoped) — stored for reference and used in the fallback rfcMessageId |
| folder | Enum | INBOX \| SENT |
| subject | String? | |
| fromName | String? | |
| fromEmail | String? | |
| toRecipients | Json | Array of {name, email} |
| ccRecipients | Json | Array of {name, email} |
| bccRecipients | Json | Array of {name, email} (populated for locally sent messages) |
| bodyText | String? | Plain text body |
| bodyHtml | String? | HTML body |
| sentAt | DateTime? | |
| isRead | Boolean | default false |
| isDeleted | Boolean | default false (soft delete, user-initiated) |
| createdAt | DateTime | |

Unique constraint: `(emailAccountId, rfcMessageId)` — prevents duplicate sync. RFC 822 Message-ID is stable across folders and sessions, unlike IMAP UIDs which are folder-scoped and can reset. `inboxLastUid` / `sentLastUid` on `EmailAccount` serve as the incremental sync cursor per folder.

### `EmailsToContacts`
Junction table linking emails to CRM contacts (following `DocumentsToContacts` pattern).

| Field | Type | Notes |
|---|---|---|
| emailId | UUID | FK → Email, part of composite PK |
| contactId | UUID | FK → crm_Contacts, part of composite PK |

Composite PK: `(emailId, contactId)`. Indexed on both fields.

### `EmailsToAccounts`
Junction table linking emails to CRM accounts.

| Field | Type | Notes |
|---|---|---|
| emailId | UUID | FK → Email, part of composite PK |
| accountId | UUID | FK → crm_Accounts, part of composite PK |

Composite PK: `(emailId, accountId)`. Indexed on both fields.

### `EmailEmbedding`
Follows existing pgvector pattern (`crm_Embeddings_Accounts`, etc.).

| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| emailId | UUID | unique FK → Email |
| embedding | vector(1536) | pgvector |
| contentHash | String | SHA of subject+bodyText |
| embeddedAt | DateTime | |

---

## Profile — Email Accounts Tab

New tab added to `ProfileTabs` component: **"Email Accounts"**.

File: `app/[locale]/(routes)/profile/components/tabs/EmailAccountsTabContent.tsx`

**Contents:**
- List of connected accounts: label, host, username, last synced timestamp, active/inactive badge (clickable — toggles `isActive` via `setEmailAccountActive`)
- **Add account** button → dialog with form:
  - Label, IMAP host, IMAP port, IMAP SSL toggle
  - SMTP host, SMTP port, SMTP SSL toggle
  - Username, Password (write-only — never returned from server after save)
  - "Test Connection" button — validates IMAP before saving
- **Delete** button per account (with confirmation dialog)
- **Sync now** button per account — triggers on-demand Inngest sync

---

## `/emails` Route UI

Route: `app/[locale]/(routes)/emails/page.tsx`

### Layout — Three-panel email client

**Left sidebar:**
- Account switcher (dropdown or list of mailboxes)
- Folder selector: Inbox / Sent
- "Compose" button

**Middle panel — Email list:**
- Paginated email rows: sender, subject, date, read/unread indicator (50 per page, offset-based; returns `{ emails, total, page, totalPages }`)
- Search bar at top: semantic search via pgvector (cosine similarity ≥ 0.7); falls back to `ILIKE` text search on subject + fromEmail if query is < 3 characters or no embedding exists yet for the query
- Error state: if load fails, show inline error with retry button
- Uses existing `EmailsSkeleton` component for loading state

**Right panel — Email detail:**
- Full email: from, to, cc, subject, date, body
- HTML body rendered in sandboxed `<iframe srcdoc>` (see Security)
- Action buttons: **Reply**, **Forward**, **Delete**
- CRM badges: if sender/recipient matches a Contact or Account, show a badge linking to their CRM record

**Compose modal** (new, reply, forward):
- Fields: To, CC, Subject, body (plain text or rich text)
- On reply: pre-populates To, Subject (`Re: ...`), quotes original body
- On forward: pre-populates Subject (`Fwd: ...`), quotes original body
- Send triggers `sendEmail` server action

**URL state:** `?accountId=<uuid>&folder=INBOX` — mailbox + folder selection is bookmarkable.

---

## Server Actions

Location: `actions/emails/`

### `actions/emails/accounts.ts`
```
getEmailAccounts()              — list current user's accounts (password omitted)
createEmailAccount(data)        — validate, encrypt password, save
deleteEmailAccount(id)          — verify ownership, cascade delete emails
testEmailConnection(data)       — open IMAP connection, return { ok, error }
```

### `actions/emails/messages.ts`
```
getEmails(accountId, folder, page, search)  — paginated (50/page), filtered by userId AND isDeleted=false; returns { emails, total, page, totalPages }. COUNT(*) is capped at 10,000 for performance on large mailboxes — totalPages reflects the cap.
getEmail(id)                               — fetch (isDeleted=false) + mark isRead=true
deleteEmail(id)                            — verify ownership, set isDeleted=true
sendEmail({ to, cc, bcc, subject, body, inReplyTo? }) — send via SMTP; set inReplyTo header and build References header (parent's References + parent's Message-ID); immediately write record to Email table (folder=SENT, isRead=true, bccRecipients populated)
setEmailAccountActive(id, isActive)        — verify ownership, toggle isActive on account
```

### `actions/emails/sync.ts`
```
triggerSync(accountId)    — verify ownership, fire Inngest email/sync-account event
```

All actions read `userId` from NextAuth session. All DB queries filter by `userId`.

---

## Inngest Functions

Only `/api/inngest` remains as an HTTP route (required by Inngest webhook contract).

### `email/sync-all`
- **Trigger:** Cron, every 15 minutes
- **Logic:** Fetch all active `EmailAccount` records, fan out one `email/sync-account` event per account

### `email/sync-account`
- **Trigger:** `email/sync-all` fan-out or `triggerSync()` server action
- **Logic:**
  1. Decrypt IMAP password
  2. Connect via `imap` package
  3. Fetch messages with UID > `inboxLastUid` from INBOX, UID > `sentLastUid` from SENT (cursor-based, not timestamp-based)
  4. Parse with `mailparser`
  5. Upsert all new messages into `Email` table (unique on `(emailAccountId, rfcMessageId)`) — in a single transaction
  6. Update `EmailAccount.lastSyncedAt`, `inboxLastUid`, `sentLastUid` — **atomically within the same transaction as step 5**. Cursor only advances if all upserts succeed. If the transaction fails, the cursor is not advanced and the next sync cycle retries.
  7. Fire `email/embed-email` for each successfully upserted message

### `email/embed-email`
- **Trigger:** `email/sync-account` per new message
- **Concurrency:** Inngest concurrency limit of 10 (prevents OpenAI API quota exhaustion on large syncs)
- **Logic:**
  1. Compute SHA hash of `subject + bodyText`
  2. Skip if `EmailEmbedding.contentHash` matches (no change)
  3. Call OpenAI embeddings API (`text-embedding-3-small`, 1536 dims)
  4. Upsert `EmailEmbedding`
  5. Fire `email/link-crm`

### `email/link-crm`
- **Trigger:** `email/embed-email` after embedding
- **Logic:**
  1. Extract all email addresses from `fromEmail`, `toRecipients`, `ccRecipients`
  2. Query `crm_Contacts` and `crm_Accounts` for matching email fields
  3. Write links to junction tables (e.g. `EmailsToContacts`, `EmailsToAccounts`)

---

## Security

### Credential Encryption
- Algorithm: AES-256-GCM
- Key: `EMAIL_ENCRYPTION_KEY` env var — exactly **64 hex characters** (representing 32 bytes). Server must fail fast at startup if the key is missing or not 64 hex chars.
- Encrypt on `createEmailAccount`, decrypt only inside Inngest functions and `sendEmail` action
- Password **never returned** to client in any response

### Ownership Enforcement
- Every server action extracts `userId` from NextAuth session
- All Prisma queries include `WHERE userId = <sessionUserId>`
- `deleteEmailAccount` and `deleteEmail` verify ownership before mutating
- `deleteEmailAccount` performs a hard delete (removes the account and cascades to all related `Email`, `EmailEmbedding`, `EmailsToContacts`, and `EmailsToAccounts` rows via Prisma `onDelete: Cascade`). The soft-delete pattern (`isDeleted`) applies only to user-initiated deletion of individual messages.
- Users never see other users' accounts or emails

### HTML Email Rendering
- Rendered in `<iframe srcdoc={bodyHtml} sandbox="allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer">`
- `sandbox` — blocks all scripts (XSS prevention). Note: because `allow-same-origin` and `allow-scripts` are intentionally absent, `contentDocument` is inaccessible — do NOT attempt to auto-resize via `onLoad + scrollHeight`. Use a fixed `max-height` (e.g. 600px) with `overflow-y: auto` on the iframe instead.
- `referrerPolicy="no-referrer"` — blocks tracking pixel leaks
- `allow-popups allow-popups-to-escape-sandbox` — links open in new tab outside the sandbox

### SMTP Sending
- Uses `nodemailer` (already installed)
- `inReplyTo` and `References` headers set on reply/forward for correct threading
- SMTP credentials decrypted at call time, never stored in memory beyond the request

---

## CRM Integration

Junction tables defined in Data Models above (`EmailsToContacts`, `EmailsToAccounts`).

The `email/link-crm` Inngest function matches `fromEmail`, `toRecipients`, and `ccRecipients` addresses against `crm_Contacts.email` and `crm_Accounts.email`. `bccRecipients` is intentionally excluded from matching (privacy: BCC recipients are not visible to the email sender's CRM). Matches are written as rows in the junction tables. Existing links are not duplicated (upsert or check-before-insert).

CRM badges shown in email detail view when links exist — clicking a badge navigates to the matched contact/account.

---

## File Structure

```
prisma/
  schema.prisma                        — add EmailAccount, Email, EmailEmbedding models

actions/
  emails/
    accounts.ts                        — account CRUD server actions
    messages.ts                        — email CRUD + send server actions
    sync.ts                            — triggerSync server action

app/[locale]/(routes)/
  emails/
    page.tsx                           — main emails page
    loading.tsx                        — skeleton fallback
    components/
      EmailSidebar.tsx                 — account + folder switcher
      EmailList.tsx                    — paginated email list
      EmailDetail.tsx                  — email viewer (iframe render)
      ComposeModal.tsx                 — new / reply / forward modal
      EmailCrmBadges.tsx               — CRM link badges

  profile/
    components/
      tabs/
        EmailAccountsTabContent.tsx    — email account management tab

inngest/
  emails/
    sync-all.ts                        — cron fan-out function
    sync-account.ts                    — per-account IMAP sync
    embed-email.ts                     — embedding generation
    link-crm.ts                        — CRM auto-linking

lib/
  email-crypto.ts                      — AES-256-GCM encrypt/decrypt helpers
```

---

## Environment Variables

```
EMAIL_ENCRYPTION_KEY=<64 hex characters = 32 bytes, e.g. openssl rand -hex 32>
```

This is the only new env var required. IMAP/SMTP credentials are stored per-account in the DB (encrypted). OpenAI API key and Inngest keys are already configured in the existing environment.

---

## Success Criteria

**Happy path:**
- User can add multiple IMAP accounts under `/profile` with working test-connection validation
- Emails sync from Inbox + Sent every 15 min and on demand; cursor advances correctly between syncs
- `/emails` shows correct emails per selected account/folder, scoped strictly to the logged-in user
- Compose, reply, forward send correctly with proper threading headers; sent email appears immediately in the Sent view
- Semantic search returns relevant results via pgvector; falls back to text search gracefully
- Sender/recipient emails matched to CRM contacts/accounts and shown as badges
- HTML emails rendered safely in sandboxed iframe with no XSS or CSS bleed into the app

**Error paths:**
- Failed IMAP connection during test shows a clear error message in the form
- Failed sync (IMAP unreachable) logs the error in Inngest and does not advance the cursor; retried on next cycle
- Send failure surfaces a toast error to the user; no partial DB record created
- If no email accounts are configured, `/emails` shows an empty state with a link to `/profile`
