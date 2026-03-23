# LLM API Keys Management — Design Spec

**Date:** 2026-03-23
**Branch:** feature/contact-enrichment
**Status:** Approved

## Overview

Remove the hard requirement for `FIRECRAWL_API_KEY` and `OPENAI_API_KEY` environment variables. Instead, implement a 3-tier priority system where API keys can be configured at the ENV level, by an admin system-wide, or by individual users in their profile. The app builds and runs without any AI keys in `.env`; enrichment features gracefully degrade when no key is found.

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

  @@unique([scope, userId, provider])
  @@index([scope, provider])
}
```

The `@@unique` constraint on `(scope, userId, provider)` ensures one key per provider per scope/user.

### Encryption

Reuse `lib/email-crypto.ts` (AES-256-GCM, keyed by `EMAIL_ENCRYPTION_KEY` env var). No new crypto utility needed.

### Key Resolver

New file: `lib/api-keys.ts`

```ts
export async function getApiKey(
  provider: ApiKeyProvider,
  userId: string
): Promise<string | null>
```

Priority:
1. `process.env[PROVIDER_ENV_MAP[provider]]` — if set, return immediately
2. `ApiKeys` where `scope = SYSTEM`, `provider = provider` — decrypt and return if found
3. `ApiKeys` where `scope = USER`, `userId = userId`, `provider = provider` — decrypt and return if found
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

- Add `ApiKeys` table and enums via new Prisma migration
- Migrate existing `openAi_keys` rows: encrypt `api_key`, insert as `scope=USER`, `provider=OPENAI`
- Drop `openAi_keys` table
- Remove `openAi_key` relation from `Users` model

---

## 2. Server Actions

### Admin (system-wide keys)

File: `app/[locale]/(routes)/admin/actions/api-keys.ts`

| Action | Description |
|---|---|
| `getSystemApiKeys()` | Returns all providers with status: `ENV_ACTIVE`, `SYSTEM_SET`, `NOT_CONFIGURED`. Never returns decrypted keys — only last 4 chars for display. |
| `upsertSystemApiKey(provider, key)` | Encrypts key, upserts row with `scope=SYSTEM`. Calls `revalidatePath("/admin/llm-keys")`. |
| `deleteSystemApiKey(provider)` | Deletes system key row. Calls `revalidatePath`. |

Guard: each action checks `session.user.is_admin` and throws if not admin.

### User profile keys

File: `app/[locale]/(routes)/profile/actions/api-keys.ts`

| Action | Description |
|---|---|
| `getUserApiKeys()` | Returns provider statuses for the current user. |
| `upsertUserApiKey(provider, key)` | Encrypts key, upserts row with `scope=USER`, `userId=session.user.id`. |
| `deleteUserApiKey(provider)` | Deletes user key row. |

Guard: each action requires authenticated session.

---

## 3. Enrich Routes

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

The `402` + `NO_API_KEY` error code is a distinct signal the frontend uses to show the setup modal instead of a generic error toast.

The `AgentEnrichmentStrategy` constructor already accepts both keys as arguments — no changes needed there.

---

## 4. Frontend

### Admin Page Redesign

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

**Replace developer tab:**
- Rename/repurpose `DeveloperTabContent.tsx` → `LlmsTabContent.tsx`
- Update `ProfileTabs.tsx`: change tab label from "Developer" to "LLMs", update URL param from `developer` to `llms`
- Tab URL: `/profile?tab=llms`

**Tab content:**
- One section per provider: label, description, a masked input + Save + Remove button
- If a higher-tier key is active (ENV or system), show an informational note: "A system-wide key is active — your key will be used as fallback"
- Simple form, no modals — matches existing profile tab style (see `OpenAiForm.tsx` as reference)

### No API Key Modal

**New component:** `components/ui/NoApiKeyDialog.tsx`
- Triggered when an enrich route returns `{ error: "NO_API_KEY" }`
- Content: "Enrichment requires API keys. Configure them in your profile settings or ask your admin."
- Two actions: "Go to Settings" (→ `/profile?tab=llms`) and "Close"
- Wired into `EnrichDrawer` and `BulkEnrichModal` error handling (both contacts and targets)

---

## 5. File Tree (new/modified)

```
prisma/
  schema.prisma                          modified — add ApiKeys model, remove openAi_keys
  migrations/YYYYMMDD_add_api_keys/      new migration

lib/
  api-keys.ts                            NEW — getApiKey resolver

app/[locale]/(routes)/
  admin/
    layout.tsx                           NEW — sidebar nav layout
    llm-keys/
      page.tsx                           NEW — LLM keys admin page
    actions/
      api-keys.ts                        NEW — system key server actions

  profile/
    components/tabs/
      LlmsTabContent.tsx                 NEW (replaces DeveloperTabContent)
    actions/
      api-keys.ts                        NEW — user key server actions

  components/ui/
    NoApiKeyDialog.tsx                   NEW

app/api/crm/
  contacts/enrich/route.ts              modified — swap env reads for getApiKey()
  targets/enrich/route.ts               modified — swap env reads for getApiKey()
```

---

## 6. Error Handling & Edge Cases

| Scenario | Behaviour |
|---|---|
| No key at any tier | Enrich route returns `402 NO_API_KEY`; frontend shows `NoApiKeyDialog` |
| ENV key set | Admin/profile pages show it as read-only with `ENV` badge; system/user keys for that provider are ignored |
| `EMAIL_ENCRYPTION_KEY` missing | `encrypt()`/`decrypt()` throws; server action returns error toast |
| User deletes their key when system key exists | Enrichment falls back to system key transparently |
| Admin deletes system key when user has one | Enrichment falls back to user key transparently |

---

## 7. Security

- Keys are encrypted with AES-256-GCM before DB storage
- Decrypted keys are never returned to the client — only masked suffix for display
- Server actions validate session on every call
- `EMAIL_ENCRYPTION_KEY` must be set in `.env` (already required for email accounts)
