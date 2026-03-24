# LLM API Keys Management — Design Spec

**Date:** 2026-03-23
**Branch:** feature/contact-enrichment
**Status:** Approved

## Overview

Remove the hard requirement for `FIRECRAWL_API_KEY` and `OPENAI_API_KEY` environment variables. Instead, implement a 3-tier priority system where API keys can be configured at the ENV level, by an admin system-wide, or by individual users in their profile. The app builds and runs without any AI keys in `.env`; enrichment features gracefully degrade when no key is found.

## Priority Order

```
ENV variable  →  Admin system-wide  →  User profile
(highest)                              (lowest)
```

ENV always wins. System-wide admin keys take precedence over individual user keys. User-profile keys are the last resort — used only when neither ENV nor a system-wide key is configured for that provider.

## Goals

- App builds and starts without `FIRECRAWL_API_KEY` or `OPENAI_API_KEY` in `.env`
- Admins can configure system-wide keys at `/en/admin` (new redesigned UI)
- Users can configure their own keys in profile settings (new LLMs tab)
- Enrichment buttons show an informative modal when no key is available at any tier
- Keys are encrypted at rest using AES-256-GCM

## Non-Goals

- Support for LLM providers beyond OpenAI and Firecrawl at launch (schema is extensible)
- Per-key usage tracking or quotas
- Key rotation or expiry

---

## 1. Data Layer

### New Prisma Model

Replaces the existing `openAi_keys` model (which stores keys unencrypted and only supports OpenAI).

```prisma
enum ApiKeyScope {
  SYSTEM
  USER
}

enum ApiKeyProvider {
  OPENAI
  FIRECRAWL
  ANTHROPIC
  GROQ
}

model ApiKeys {
  id           String         @id @default(uuid()) @db.Uuid
  scope        ApiKeyScope
  userId       String?        @db.Uuid        // null for SYSTEM scope
  provider     ApiKeyProvider
  encryptedKey String
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
  user         Users?         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([scope, provider])
  @@index([userId, provider])
}
```

**Note on uniqueness:** A standard `@@unique([scope, userId, provider])` does not work for SYSTEM rows because PostgreSQL treats `NULL != NULL`, meaning multiple system rows per provider would be allowed. Instead the migration adds two partial unique indexes via raw SQL:

```sql
-- One system key per provider
CREATE UNIQUE INDEX api_keys_system_provider_unique
  ON "ApiKeys" (provider)
  WHERE scope = 'SYSTEM';

-- One user key per provider per user
CREATE UNIQUE INDEX api_keys_user_provider_unique
  ON "ApiKeys" ("userId", provider)
  WHERE scope = 'USER';
```

### Encryption

Reuse `lib/email-crypto.ts` (AES-256-GCM, keyed by `EMAIL_ENCRYPTION_KEY` env var). No new crypto utility needed.

### Key Resolver

New file: `lib/api-keys.ts`

```ts
export async function getApiKey(
  provider: ApiKeyProvider,
  userId?: string          // optional — omit for background/system-only lookup
): Promise<string | null>
```

Priority:
1. `process.env[PROVIDER_ENV_MAP[provider]]` — if set, return immediately
2. `ApiKeys` where `scope = SYSTEM`, `provider = provider` — decrypt and return if found
3. If `userId` provided: `ApiKeys` where `scope = USER`, `userId = userId`, `provider = provider` — decrypt and return if found
4. Return `null`

`PROVIDER_ENV_MAP`:
```ts
const PROVIDER_ENV_MAP: Record<ApiKeyProvider, string> = {
  OPENAI: "OPENAI_API_KEY",
  FIRECRAWL: "FIRECRAWL_API_KEY",
  ANTHROPIC: "ANTHROPIC_API_KEY",
  GROQ: "GROQ_API_KEY",
};
```

### Migration

- Add `ApiKeys` table, enums, and partial unique indexes via new Prisma migration
- Migrate existing `openAi_keys` rows: encrypt `api_key`, insert as `scope=USER`, `provider=OPENAI`. Discard `organization_id` (unused sentinel field) and `v` fields.
- Drop `openAi_keys` table
- Remove `openAi_key` relation from `Users` model

---

## 2. Server Actions

### Admin (system-wide keys)

File: `app/[locale]/(routes)/admin/actions/api-keys.ts`

| Action | Description |
|---|---|
| `getSystemApiKeys()` | Returns all providers with status: `ENV_ACTIVE`, `SYSTEM_SET`, `NOT_CONFIGURED`. Never returns decrypted keys — only last 4 chars for display. |
| `upsertSystemApiKey(provider, key)` | Encrypts key, upserts row with `scope=SYSTEM`. Calls `revalidatePath` using the locale-aware path pattern matching other admin actions in the codebase. |
| `deleteSystemApiKey(provider)` | Deletes system key row. Calls `revalidatePath`. |

Guard: each action checks `session.user.is_admin` and throws if not admin.

### User profile keys

File: `app/[locale]/(routes)/profile/actions/api-keys.ts`

| Action | Description |
|---|---|
| `getUserApiKeys()` | Returns provider statuses for the current user, including whether a higher-tier key (ENV or system) is active for each provider. |
| `upsertUserApiKey(provider, key)` | Encrypts key, upserts row with `scope=USER`, `userId=session.user.id`. |
| `deleteUserApiKey(provider)` | Deletes user key row. |

Guard: each action requires authenticated session.

---

## 3. Enrich Routes and Inngest Functions

### SSE Enrich Routes

Both `/api/crm/contacts/enrich` and `/api/crm/targets/enrich` are updated:

**Before:**
```ts
const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;
if (!firecrawlApiKey || !openaiApiKey) {
  return NextResponse.json({ error: "Enrichment not configured..." }, { status: 503 });
}
```

**After:**
```ts
const firecrawlApiKey = await getApiKey("FIRECRAWL", session.user.id);
const openaiApiKey = await getApiKey("OPENAI", session.user.id);
if (!firecrawlApiKey || !openaiApiKey) {
  return NextResponse.json({ error: "NO_API_KEY" }, { status: 402 });
}
```

The `402` + `NO_API_KEY` error code is the distinct signal the frontend uses to show the setup modal instead of a generic error toast.

The `AgentEnrichmentStrategy` constructor already accepts both keys as arguments — no changes needed there.

### Inngest Bulk-Enrich Functions

The Inngest background functions (`inngest/functions/enrich-contact.ts`, `inngest/functions/enrich-target.ts`) also read `process.env` directly. These run without an active HTTP session.

**Solution:** `triggeredBy` (userId) is present in the bulk fan-out functions but is not currently forwarded to the per-record child events. Two changes are required:

**(a) Bulk fan-out functions** (`enrich-contacts-bulk.ts`, `enrich-targets-bulk.ts`) — add `triggeredBy` to each child event payload:

```ts
// When sending child events
await step.sendEvent("enrich/contact.run", records.map(r => ({
  data: { contactId: r.contactId, enrichmentId: r.id, fields, triggeredBy }
  //                                                           ^^^^^^^^^^^^ add this
})));
```

**(b) Per-record functions** (`enrich-contact.ts`, `enrich-target.ts`) — destructure `triggeredBy` and use it for key resolution:

```ts
const { contactId, enrichmentId, fields, triggeredBy } = event.data;
const firecrawlApiKey = await getApiKey("FIRECRAWL", triggeredBy);
const openaiApiKey = await getApiKey("OPENAI", triggeredBy);
if (!firecrawlApiKey || !openaiApiKey) {
  await prismadb.crm_Contact_Enrichment.update({
    where: { id: enrichmentId },
    data: { status: "FAILED", error: "NO_API_KEY: configure keys in admin or profile settings" }
  });
  return;
}
```

`getApiKey` with a userId will resolve ENV → system → user-profile, same as the HTTP routes.

---

## 4. Frontend

### Admin Page Redesign

**Existing admin structure:** The current admin page already contains `OpenAiCard`, `GptCard`, and `SetGptModel` — these are the old per-admin OpenAI key management UI. They are superseded by the new `llm-keys` page and **must be removed** from `admin/page.tsx` and `admin/_components/` when the new page is added. `ResendCard` (email service config) is unrelated and stays. The existing `admin/users/` and `admin/modules/` sub-pages are preserved and will be wrapped by the new `layout.tsx` sidebar.

The existing `admin/page.tsx` should redirect to `admin/llm-keys` as the new default, or be repurposed as the LLM keys page directly.

**New layout:** `app/[locale]/(routes)/admin/layout.tsx`
- Persistent sidebar with nav items: LLM Keys, Users, Modules, Services
- Uses shadcn/ui `Card`, `Badge`, `Button` — inherits app dark/light theme via CSS variables
- No hardcoded colors; all from Tailwind's `bg-card`, `text-foreground`, `text-muted-foreground`, `border`, etc.

**LLM Keys page:** `app/[locale]/(routes)/admin/llm-keys/page.tsx`
- One card per provider (OpenAI, Firecrawl, Anthropic, Groq)
- Card shows: provider name, source badge (`ENV` / `System` / `Not configured`), masked key (`••••3fa2`)
- ENV-sourced keys show an informational note, no edit controls (read-only)
- System keys show Edit (inline input reveal) and Remove actions
- Unconfigured providers show an "Add key" button
- Uses `useTransition` + server actions for non-blocking saves

### Profile LLMs Tab

**Add a new tab — keep Developer tab.** The existing `DeveloperTabContent.tsx` contains `ApiTokens` (app API bearer tokens for third-party integrations) alongside `OpenAiForm`. The `ApiTokens` component is unrelated to LLM providers and must not be lost. Therefore:

- **Keep** the `developer` tab as-is (contains `ApiTokens`)
- **Add** a new `llms` tab for LLM provider key management
- **Remove** `OpenAiForm` from `DeveloperTabContent.tsx` (it is superseded by the new LLMs tab)

The tab system in `ProfileTabs.tsx` uses a hardcoded TypeScript union. All of the following must be updated:
- `ProfileTabs.tsx` — add `"llms"` to the union type, `TAB_IDS`, `TAB_ICONS`, `contentMap`, add `llmsContent` prop; remove `OpenAiForm` from `developerContent`
- `profile/page.tsx` — add `llmsContent` prop
- Translation keys — add `tabs.llms` / `tabs.llmsDesc`
- New file: `LlmsTabContent.tsx`
- Tab URL: `/profile?tab=llms`

**Tab content (`LlmsTabContent.tsx`):**
- One section per provider: label, short description, password input + Save + Remove button
- If ENV or system key is active for a provider, show: "A system-wide key is active — your key is not in use"
- Simple form matching existing profile tab style (reference `OpenAiForm.tsx`)

### No API Key Dialog

**New component:** `components/NoApiKeyDialog.tsx` (not in `components/ui/` — this has business logic)
- Triggered when an enrich route returns `{ error: "NO_API_KEY" }`
- Content: "Enrichment requires API keys. Configure them in your profile settings, or ask your admin to set a system-wide key."
- Two actions: "Go to Settings" (→ `/profile?tab=llms`) and "Close"
- Wired into the following components for both contacts and targets:
  - `EnrichButton` / detail-page enrich trigger (single-record enrichment)
  - `BulkEnrichModal` (contacts bulk)
  - `BulkEnrichTargetsModal` (targets bulk)
- Note: bulk modals call `/enrich-bulk` routes — those routes only fire an Inngest event today and do not call enrichment directly. They must be updated to call `getApiKey` before sending the Inngest event and return `402 NO_API_KEY` early if no key is found, providing fast user feedback rather than a silent Inngest job failure.

---

## 5. File Tree (new/modified)

```
prisma/
  schema.prisma                          modified — add ApiKeys model + enums, remove openAi_keys
  migrations/YYYYMMDD_add_api_keys/      new migration (includes partial unique index SQL)

lib/
  api-keys.ts                            NEW — getApiKey resolver

inngest/functions/
  enrich-contact.ts                      modified — swap env reads for getApiKey(provider, triggeredBy)
  enrich-target.ts                       modified — same

app/[locale]/(routes)/
  admin/
    layout.tsx                           NEW — sidebar nav layout
    page.tsx                             modified — redirect to llm-keys; remove OpenAiCard/GptCard
    llm-keys/
      page.tsx                           NEW — LLM keys admin page
    actions/
      api-keys.ts                        NEW — system key server actions
    _components/
      OpenAiCard.tsx                     deleted — superseded by llm-keys page
      GptCard.tsx                        deleted — superseded
    forms/
      SetGptModel.tsx                    deleted — superseded (verify exact path before deleting)

  profile/
    page.tsx                             modified — add llmsContent prop
    components/
      ProfileTabs.tsx                    modified — add llms tab to union/contentMap; remove OpenAiForm from developer tab
      tabs/
        LlmsTabContent.tsx               NEW
        DeveloperTabContent.tsx          modified — remove OpenAiForm section (keep ApiTokens)
    actions/
      api-keys.ts                        NEW — user key server actions

  components/
    NoApiKeyDialog.tsx                   NEW

app/api/crm/
  contacts/enrich/route.ts              modified — swap env reads for getApiKey()
  contacts/enrich-bulk/route.ts         modified — same, return 402 NO_API_KEY
  targets/enrich/route.ts               modified — same
  targets/enrich-bulk/route.ts          modified — same
```

---

## 6. Error Handling & Edge Cases

| Scenario | Behaviour |
|---|---|
| No key at any tier | Enrich route returns `402 NO_API_KEY`; frontend shows `NoApiKeyDialog` |
| ENV key set | Admin/profile pages show it as read-only with `ENV` badge; system/user keys for that provider are stored but never resolved |
| `EMAIL_ENCRYPTION_KEY` missing | `encrypt()`/`decrypt()` throws; server action returns error toast |
| User deletes their key when system key exists | Enrichment uses system key (higher priority) |
| Admin deletes system key when user has one | Enrichment falls back to user key |
| Inngest job has no key | Job marked `FAILED` with `NO_API_KEY` error message |
| User key set but system key also set | System key is used; profile tab informs user their key is not in use |

---

## 7. Security

- Keys are encrypted with AES-256-GCM before DB storage
- Decrypted keys are never returned to the client — only masked suffix (last 4 chars) for display
- Server actions validate session on every call; admin actions additionally check `is_admin`
- `EMAIL_ENCRYPTION_KEY` must be set in `.env` (already required for email accounts)
- Inngest functions receive `userId` via event payload — they do not bypass the resolver
