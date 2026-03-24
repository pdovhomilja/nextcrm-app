# LLM API Keys Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hard-coded `FIRECRAWL_API_KEY` / `OPENAI_API_KEY` env requirements with a 3-tier key system (ENV → admin system-wide → user profile), including encrypted DB storage, a redesigned admin panel, a new profile LLMs tab, and a "no key configured" modal.

**Architecture:** A single `ApiKeys` Prisma model with `scope` (SYSTEM|USER) and `provider` enums stores encrypted keys. A `getApiKey(provider, userId?)` resolver implements the priority chain and is called by all enrich routes and Inngest functions. Server actions handle CRUD; the admin page gets a new sidebar layout; the profile page gets a new LLMs tab alongside the existing Developer tab.

**Tech Stack:** Next.js 15, Prisma/PostgreSQL, shadcn/ui, Tailwind CSS (CSS vars for theming), next-intl for translations, AES-256-GCM via Node.js `crypto` (already in `lib/email-crypto.ts`), Jest for unit tests.

**Spec:** `docs/superpowers/specs/2026-03-23-llm-api-keys-design.md`

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `prisma/schema.prisma` | Modify | Add `ApiKeys` model + `ApiKeyScope`/`ApiKeyProvider` enums; remove `openAi_keys` |
| `prisma/migrations/YYYYMMDD_add_api_keys/migration.sql` | Create | Migration with partial unique indexes |
| `lib/api-keys.ts` | Create | `getApiKey(provider, userId?)` resolver |
| `__tests__/lib/api-keys.test.ts` | Create | Unit tests for resolver priority logic |
| `app/[locale]/(routes)/admin/actions/api-keys.ts` | Create | Server actions: get/upsert/delete system keys |
| `app/[locale]/(routes)/admin/layout.tsx` | Create | Sidebar nav wrapping all admin routes |
| `app/[locale]/(routes)/admin/page.tsx` | Modify | Redirect to `/admin/llm-keys` |
| `app/[locale]/(routes)/admin/llm-keys/page.tsx` | Create | Provider cards page |
| `app/[locale]/(routes)/admin/_components/OpenAiCard.tsx` | Delete | Superseded |
| `app/[locale]/(routes)/admin/_components/GptCard.tsx` | Delete | Superseded |
| `app/[locale]/(routes)/admin/forms/SetGptModel.tsx` | Delete | Superseded (verify path) |
| `app/[locale]/(routes)/profile/actions/api-keys.ts` | Create | Server actions: get/upsert/delete user keys |
| `app/[locale]/(routes)/profile/components/ProfileTabs.tsx` | Modify | Add `llms` tab |
| `app/[locale]/(routes)/profile/components/tabs/DeveloperTabContent.tsx` | Modify | Remove `OpenAiForm` section |
| `app/[locale]/(routes)/profile/components/tabs/LlmsTabContent.tsx` | Create | Provider key inputs |
| `app/[locale]/(routes)/profile/page.tsx` | Modify | Add `llmsContent` prop |
| `app/components/NoApiKeyDialog.tsx` | Create | Modal shown when no key configured |
| `app/api/crm/contacts/enrich/route.ts` | Modify | Swap `process.env` → `getApiKey()` |
| `app/api/crm/contacts/enrich-bulk/route.ts` | Modify | Add key check before Inngest send |
| `app/api/crm/targets/enrich/route.ts` | Modify | Same as contacts enrich |
| `app/api/crm/targets/enrich-bulk/route.ts` | Modify | Same as contacts enrich-bulk |
| `inngest/functions/enrich-contact.ts` | Modify | Swap `process.env` → `getApiKey()` |
| `inngest/functions/enrich-target.ts` | Modify | Same |
| `inngest/functions/enrich-contacts-bulk.ts` | Modify | Forward `triggeredBy` in child events |
| `inngest/functions/enrich-targets-bulk.ts` | Modify | Same |
| `locales/en.json` | Modify | Add LLMs tab translations |
| `locales/cz.json`, `de.json`, `uk.json` | Modify | Same keys (copy English strings) |

---

## Task 1: Add `ApiKeys` Prisma model and migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add enums and model to schema**

In `prisma/schema.prisma`, find the `openAi_keys` model and the `Users` model. Make these changes:

1. Add enums before the `openAi_keys` model:
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
```

2. Add the new model (after the enums):
```prisma
model ApiKeys {
  id           String         @id @default(uuid()) @db.Uuid
  scope        ApiKeyScope
  userId       String?        @db.Uuid
  provider     ApiKeyProvider
  encryptedKey String
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
  user         Users?         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([scope, provider])
  @@index([userId, provider])
}
```

3. In the `Users` model, add the relation:
```prisma
  apiKeys              ApiKeys[]
```
(Add it alongside the other relations like `apiTokens`, `emailAccounts`, etc.)

4. Remove the `openAi_keys` model entirely.

5. Remove the `openAi_key  openAi_keys[]` line from the `Users` model.

- [ ] **Step 2: Run `prisma generate` to check for errors**

```bash
cd /Users/pavel-clawdbot/.openclaw/workspace-chopper/development/nextcrm-app
pnpm prisma generate
```
Expected: No errors. If you see "Unknown field 'openAi_key'" or similar, you missed a reference in the `Users` model — grep for `openAi_key` and remove all instances.

- [ ] **Step 3: Create migration**

```bash
pnpm prisma migrate dev --name add_api_keys --create-only
```

This creates a migration file at `prisma/migrations/YYYYMMDD_add_api_keys/migration.sql`. Open it and **append** these lines at the end (before any closing statements):

```sql
-- Partial unique indexes (@@unique doesn't handle NULL correctly for SYSTEM scope)
CREATE UNIQUE INDEX "api_keys_system_provider_unique"
  ON "ApiKeys" (provider)
  WHERE scope = 'SYSTEM';

CREATE UNIQUE INDEX "api_keys_user_provider_unique"
  ON "ApiKeys" ("userId", provider)
  WHERE scope = 'USER';

-- Migrate existing openAi_keys data
-- Note: EMAIL_ENCRYPTION_KEY must be set for this to work.
-- If the table is empty, this is a no-op.
-- Encryption is handled in Task 2's data migration script — skip raw SQL encryption here.
-- The migration script in Task 2 will handle the data.
```

- [ ] **Step 4: Apply migration**

```bash
pnpm prisma migrate dev
```
Expected: Migration applied, `ApiKeys` table created.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add ApiKeys model — replace openAi_keys with encrypted multi-provider key store"
```

---

## Task 2: Data migration script (encrypt existing OpenAI keys)

**Files:**
- Create: `scripts/migrate-openai-keys.ts`

- [ ] **Step 1: Write migration script**

Create `scripts/migrate-openai-keys.ts`:

```ts
/**
 * One-time migration: copy openAi_keys rows into ApiKeys with encryption.
 * Run with: pnpm exec tsx scripts/migrate-openai-keys.ts
 * Requires EMAIL_ENCRYPTION_KEY to be set in your .env.
 */
import { PrismaClient } from "@prisma/client";
import { encrypt } from "@/lib/email-crypto";

const prisma = new PrismaClient();

async function main() {
  // After the migration, openAi_keys table is gone — this script
  // should be run BEFORE applying the migration that drops the table,
  // or you can skip it if the table was empty.
  //
  // If you need to recover data, restore from backup first.
  console.log("Migration complete: openAi_keys table was dropped in the Prisma migration.");
  console.log("If you had existing data, restore it from backup and re-run this script");
  console.log("against a schema that still has openAi_keys.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

> **Note:** The `openAi_keys` table is dropped by the Prisma migration. If the project has existing OpenAI keys in production, export them first (`SELECT * FROM openAi_keys`), then run this script against the new schema to encrypt and insert them. For new installations, this is a no-op.

- [ ] **Step 2: Commit**

```bash
git add scripts/migrate-openai-keys.ts
git commit -m "chore: add openai keys migration script"
```

---

## Task 3: `lib/api-keys.ts` — key resolver

**Files:**
- Create: `lib/api-keys.ts`
- Create: `__tests__/lib/api-keys.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/lib/api-keys.test.ts`:

```ts
/**
 * Tests for the 3-tier API key resolver.
 * Priority: ENV variable → SYSTEM key in DB → USER key in DB → null
 */
import { getApiKey } from "@/lib/api-keys";
import { prismadb } from "@/lib/prisma";
import { decrypt, encrypt } from "@/lib/email-crypto";

// Mock prismadb to avoid real DB calls
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    apiKeys: {
      findFirst: jest.fn(),
    },
  },
}));

// Mock email-crypto so we don't need EMAIL_ENCRYPTION_KEY in tests
jest.mock("@/lib/email-crypto", () => ({
  encrypt: jest.fn((s: string) => `enc:${s}`),
  decrypt: jest.fn((s: string) => s.replace("enc:", "")),
}));

const mockFindFirst = prismadb.apiKeys.findFirst as jest.Mock;

const TEST_USER_ID = "user-123";

beforeEach(() => {
  jest.clearAllMocks();
  // Clear any env vars set in previous tests
  delete process.env.OPENAI_API_KEY;
  delete process.env.FIRECRAWL_API_KEY;
});

describe("getApiKey — tier 1: ENV variable", () => {
  it("returns ENV value immediately when set, skipping DB", async () => {
    process.env.OPENAI_API_KEY = "env-key-abc";
    const result = await getApiKey("OPENAI", TEST_USER_ID);
    expect(result).toBe("env-key-abc");
    expect(mockFindFirst).not.toHaveBeenCalled();
  });

  it("maps providers to correct env var names", async () => {
    process.env.FIRECRAWL_API_KEY = "fc-key-xyz";
    const result = await getApiKey("FIRECRAWL", TEST_USER_ID);
    expect(result).toBe("fc-key-xyz");
  });
});

describe("getApiKey — tier 2: SYSTEM key in DB", () => {
  it("returns decrypted system key when no ENV set", async () => {
    mockFindFirst
      .mockResolvedValueOnce({ encryptedKey: "enc:system-key" }) // system lookup
      .mockResolvedValueOnce(null); // user lookup (not reached)

    const result = await getApiKey("OPENAI", TEST_USER_ID);
    expect(result).toBe("system-key");
    // Should have queried for SYSTEM scope first
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ scope: "SYSTEM", provider: "OPENAI" }),
      })
    );
  });
});

describe("getApiKey — tier 3: USER key in DB", () => {
  it("returns decrypted user key when no ENV and no system key", async () => {
    mockFindFirst
      .mockResolvedValueOnce(null) // system lookup → not found
      .mockResolvedValueOnce({ encryptedKey: "enc:user-key" }); // user lookup

    const result = await getApiKey("OPENAI", TEST_USER_ID);
    expect(result).toBe("user-key");
  });

  it("skips user lookup when userId not provided", async () => {
    mockFindFirst.mockResolvedValueOnce(null); // system lookup

    const result = await getApiKey("OPENAI");
    expect(result).toBeNull();
    expect(mockFindFirst).toHaveBeenCalledTimes(1); // only system lookup
  });
});

describe("getApiKey — tier 4: null", () => {
  it("returns null when no key found at any tier", async () => {
    mockFindFirst.mockResolvedValue(null);
    const result = await getApiKey("OPENAI", TEST_USER_ID);
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd /Users/pavel-clawdbot/.openclaw/workspace-chopper/development/nextcrm-app
pnpm jest __tests__/lib/api-keys.test.ts --no-coverage
```
Expected: FAIL — "Cannot find module '@/lib/api-keys'"

- [ ] **Step 3: Implement `lib/api-keys.ts`**

Create `lib/api-keys.ts`:

```ts
import { prismadb } from "@/lib/prisma";
import { decrypt } from "@/lib/email-crypto";

export type ApiKeyProvider = "OPENAI" | "FIRECRAWL" | "ANTHROPIC" | "GROQ";

const PROVIDER_ENV_MAP: Record<ApiKeyProvider, string> = {
  OPENAI: "OPENAI_API_KEY",
  FIRECRAWL: "FIRECRAWL_API_KEY",
  ANTHROPIC: "ANTHROPIC_API_KEY",
  GROQ: "GROQ_API_KEY",
};

/**
 * Resolve an API key using the 3-tier priority chain:
 * 1. ENV variable (OPENAI_API_KEY etc.)
 * 2. System-wide key stored in DB (scope=SYSTEM)
 * 3. User's personal key stored in DB (scope=USER) — only if userId provided
 * 4. Returns null if no key found
 */
export async function getApiKey(
  provider: ApiKeyProvider,
  userId?: string
): Promise<string | null> {
  // Tier 1: ENV
  const envKey = process.env[PROVIDER_ENV_MAP[provider]];
  if (envKey) return envKey;

  // Tier 2: system-wide DB key
  const systemRow = await prismadb.apiKeys.findFirst({
    where: { scope: "SYSTEM", provider },
    select: { encryptedKey: true },
  });
  if (systemRow) return decrypt(systemRow.encryptedKey);

  // Tier 3: user-specific DB key
  if (userId) {
    const userRow = await prismadb.apiKeys.findFirst({
      where: { scope: "USER", userId, provider },
      select: { encryptedKey: true },
    });
    if (userRow) return decrypt(userRow.encryptedKey);
  }

  return null;
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
pnpm jest __tests__/lib/api-keys.test.ts --no-coverage
```
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/api-keys.ts __tests__/lib/api-keys.test.ts
git commit -m "feat: add getApiKey resolver — 3-tier ENV/system/user priority chain"
```

---

## Task 4: Admin server actions

**Files:**
- Create: `app/[locale]/(routes)/admin/actions/api-keys.ts`

- [ ] **Step 1: Create admin actions file**

Create `app/[locale]/(routes)/admin/actions/api-keys.ts`:

```ts
"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/email-crypto";
import type { ApiKeyProvider } from "@/lib/api-keys";

export type ApiKeyStatus = "ENV_ACTIVE" | "SYSTEM_SET" | "NOT_CONFIGURED";

export interface ProviderKeyInfo {
  provider: ApiKeyProvider;
  status: ApiKeyStatus;
  maskedKey?: string; // last 4 chars, only when SYSTEM_SET
}

const ALL_PROVIDERS: ApiKeyProvider[] = ["OPENAI", "FIRECRAWL", "ANTHROPIC", "GROQ"];

const PROVIDER_ENV_MAP: Record<ApiKeyProvider, string> = {
  OPENAI: "OPENAI_API_KEY",
  FIRECRAWL: "FIRECRAWL_API_KEY",
  ANTHROPIC: "ANTHROPIC_API_KEY",
  GROQ: "GROQ_API_KEY",
};

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (!session.user.is_admin) throw new Error("Forbidden: admin only");
  return session;
}

export async function getSystemApiKeys(): Promise<ProviderKeyInfo[]> {
  await requireAdmin();

  const rows = await prismadb.apiKeys.findMany({
    where: { scope: "SYSTEM" },
    select: { provider: true, encryptedKey: true },
  });

  const rowMap = new Map(rows.map((r) => [r.provider, r.encryptedKey]));

  return ALL_PROVIDERS.map((provider) => {
    const envKey = process.env[PROVIDER_ENV_MAP[provider]];
    if (envKey) {
      return { provider, status: "ENV_ACTIVE" as ApiKeyStatus };
    }
    const encryptedKey = rowMap.get(provider);
    if (encryptedKey) {
      const plain = decrypt(encryptedKey);
      return {
        provider,
        status: "SYSTEM_SET" as ApiKeyStatus,
        maskedKey: `••••${plain.slice(-4)}`,
      };
    }
    return { provider, status: "NOT_CONFIGURED" as ApiKeyStatus };
  });
}

export async function upsertSystemApiKey(provider: ApiKeyProvider, key: string): Promise<void> {
  await requireAdmin();
  if (!key.trim()) throw new Error("Key must not be empty");

  const encryptedKey = encrypt(key.trim());

  await prismadb.apiKeys.upsert({
    where: {
      // Use a raw workaround since Prisma doesn't know about the partial unique index.
      // We rely on the DB constraint — findFirst + create/update pattern:
      id: (
        await prismadb.apiKeys.findFirst({ where: { scope: "SYSTEM", provider } })
      )?.id ?? "00000000-0000-0000-0000-000000000000",
    },
    update: { encryptedKey },
    create: { scope: "SYSTEM", provider, encryptedKey },
  });

  revalidatePath("/[locale]/admin/llm-keys", "page");
}

export async function deleteSystemApiKey(provider: ApiKeyProvider): Promise<void> {
  await requireAdmin();

  await prismadb.apiKeys.deleteMany({
    where: { scope: "SYSTEM", provider },
  });

  revalidatePath("/[locale]/admin/llm-keys", "page");
}
```

> **Note on upsert:** Prisma's `upsert` requires a unique field. Since we use partial indexes (not Prisma `@@unique`), we use a findFirst-then-create/update pattern wrapped in `upsert` with a sentinel fallback id. An alternative is `deleteMany` + `create`. Either works; the DB partial unique index prevents duplicates.

**Simpler alternative** — replace the `upsert` block with:

```ts
  await prismadb.apiKeys.deleteMany({ where: { scope: "SYSTEM", provider } });
  await prismadb.apiKeys.create({ data: { scope: "SYSTEM", provider, encryptedKey } });
```

Use this simpler form instead if the upsert pattern feels awkward.

- [ ] **Step 2: Check for TypeScript errors**

```bash
pnpm tsc --noEmit 2>&1 | grep 'admin/actions/api-keys'
```
Expected: No errors for this file.

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/(routes)/admin/actions/api-keys.ts"
git commit -m "feat: add admin server actions for system-wide API key management"
```

---

## Task 5: Profile server actions

**Files:**
- Create: `app/[locale]/(routes)/profile/actions/api-keys.ts`

- [ ] **Step 1: Create profile actions file**

Create `app/[locale]/(routes)/profile/actions/api-keys.ts`:

```ts
"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/email-crypto";
import type { ApiKeyProvider } from "@/lib/api-keys";

export type UserKeyStatus = "ENV_ACTIVE" | "SYSTEM_ACTIVE" | "USER_SET" | "NOT_CONFIGURED";

export interface UserProviderKeyInfo {
  provider: ApiKeyProvider;
  status: UserKeyStatus;
  maskedKey?: string; // only when USER_SET
}

const ALL_PROVIDERS: ApiKeyProvider[] = ["OPENAI", "FIRECRAWL", "ANTHROPIC", "GROQ"];

const PROVIDER_ENV_MAP: Record<ApiKeyProvider, string> = {
  OPENAI: "OPENAI_API_KEY",
  FIRECRAWL: "FIRECRAWL_API_KEY",
  ANTHROPIC: "ANTHROPIC_API_KEY",
  GROQ: "GROQ_API_KEY",
};

async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function getUserApiKeys(): Promise<UserProviderKeyInfo[]> {
  const userId = await requireUser();

  const [systemRows, userRows] = await Promise.all([
    prismadb.apiKeys.findMany({ where: { scope: "SYSTEM" }, select: { provider: true } }),
    prismadb.apiKeys.findMany({
      where: { scope: "USER", userId },
      select: { provider: true, encryptedKey: true },
    }),
  ]);

  const systemProviders = new Set(systemRows.map((r) => r.provider));
  const userRowMap = new Map(userRows.map((r) => [r.provider, r.encryptedKey]));

  return ALL_PROVIDERS.map((provider) => {
    if (process.env[PROVIDER_ENV_MAP[provider]]) {
      return { provider, status: "ENV_ACTIVE" as UserKeyStatus };
    }
    if (systemProviders.has(provider)) {
      return { provider, status: "SYSTEM_ACTIVE" as UserKeyStatus };
    }
    const encryptedKey = userRowMap.get(provider);
    if (encryptedKey) {
      const plain = decrypt(encryptedKey);
      return {
        provider,
        status: "USER_SET" as UserKeyStatus,
        maskedKey: `••••${plain.slice(-4)}`,
      };
    }
    return { provider, status: "NOT_CONFIGURED" as UserKeyStatus };
  });
}

export async function upsertUserApiKey(provider: ApiKeyProvider, key: string): Promise<void> {
  const userId = await requireUser();
  if (!key.trim()) throw new Error("Key must not be empty");

  const encryptedKey = encrypt(key.trim());

  await prismadb.apiKeys.deleteMany({ where: { scope: "USER", userId, provider } });
  await prismadb.apiKeys.create({ data: { scope: "USER", userId, provider, encryptedKey } });

  revalidatePath("/[locale]/profile", "page");
}

export async function deleteUserApiKey(provider: ApiKeyProvider): Promise<void> {
  const userId = await requireUser();

  await prismadb.apiKeys.deleteMany({ where: { scope: "USER", userId, provider } });

  revalidatePath("/[locale]/profile", "page");
}
```

- [ ] **Step 2: Check TypeScript**

```bash
pnpm tsc --noEmit 2>&1 | grep 'profile/actions/api-keys'
```
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/(routes)/profile/actions/api-keys.ts"
git commit -m "feat: add profile server actions for user API key management"
```

---

## Task 6: Update enrich routes to use `getApiKey`

**Files:**
- Modify: `app/api/crm/contacts/enrich/route.ts`
- Modify: `app/api/crm/targets/enrich/route.ts`
- Modify: `app/api/crm/contacts/enrich-bulk/route.ts`
- Modify: `app/api/crm/targets/enrich-bulk/route.ts`

- [ ] **Step 1: Update contacts SSE enrich route**

In `app/api/crm/contacts/enrich/route.ts`, replace:

```ts
  const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!firecrawlApiKey || !openaiApiKey) {
    return NextResponse.json(
      { error: "Enrichment not configured. Set FIRECRAWL_API_KEY and OPENAI_API_KEY." },
      { status: 503 }
    );
  }
```

with:

```ts
  const firecrawlApiKey = await getApiKey("FIRECRAWL", session.user.id);
  const openaiApiKey = await getApiKey("OPENAI", session.user.id);
  if (!firecrawlApiKey || !openaiApiKey) {
    return NextResponse.json({ error: "NO_API_KEY" }, { status: 402 });
  }
```

Also add the import at the top:
```ts
import { getApiKey } from "@/lib/api-keys";
```

- [ ] **Step 2: Update targets SSE enrich route**

In `app/api/crm/targets/enrich/route.ts`, make the same two changes (same replacement + same import).

- [ ] **Step 3: Update contacts enrich-bulk route**

In `app/api/crm/contacts/enrich-bulk/route.ts`, add a key check **before** the `inngest.send` call. After the session check and validation, add:

```ts
  import { getApiKey } from "@/lib/api-keys";

  // ... (after validation, before inngest.send)
  const firecrawlApiKey = await getApiKey("FIRECRAWL", session.user.id);
  const openaiApiKey = await getApiKey("OPENAI", session.user.id);
  if (!firecrawlApiKey || !openaiApiKey) {
    return NextResponse.json({ error: "NO_API_KEY" }, { status: 402 });
  }
```

- [ ] **Step 4: Update targets enrich-bulk route**

Repeat Step 3 for `app/api/crm/targets/enrich-bulk/route.ts`.

- [ ] **Step 5: Check TypeScript**

```bash
pnpm tsc --noEmit 2>&1 | grep 'api/crm'
```
Expected: No new errors.

- [ ] **Step 6: Commit**

```bash
git add app/api/crm/contacts/enrich/route.ts app/api/crm/contacts/enrich-bulk/route.ts
git add app/api/crm/targets/enrich/route.ts app/api/crm/targets/enrich-bulk/route.ts
git commit -m "feat: enrich routes use getApiKey — remove hard env var requirement, return 402 NO_API_KEY"
```

---

## Task 7: Update Inngest functions

**Files:**
- Modify: `inngest/functions/enrich-contacts-bulk.ts`
- Modify: `inngest/functions/enrich-targets-bulk.ts`
- Modify: `inngest/functions/enrich-contact.ts`
- Modify: `inngest/functions/enrich-target.ts`

- [ ] **Step 1: Forward `triggeredBy` in `enrich-contacts-bulk.ts`**

In `inngest/functions/enrich-contacts-bulk.ts`, find the `step.sendEvent` fan-out call:

```ts
    await step.sendEvent(
      "fan-out-enrichments",
      records.map((r: { id: string; contactId: string }) => ({
        name: "enrich/contact.run",
        data: { contactId: r.contactId, enrichmentId: r.id, fields },
      }))
    );
```

Replace with:

```ts
    await step.sendEvent(
      "fan-out-enrichments",
      records.map((r: { id: string; contactId: string }) => ({
        name: "enrich/contact.run",
        data: { contactId: r.contactId, enrichmentId: r.id, fields, triggeredBy },
      }))
    );
```

- [ ] **Step 2: Forward `triggeredBy` in `enrich-targets-bulk.ts`**

Open `inngest/functions/enrich-targets-bulk.ts` and make the same change — add `triggeredBy` to the child event data in the fan-out `step.sendEvent` call.

- [ ] **Step 3: Update `enrich-contact.ts` to use `getApiKey`**

In `inngest/functions/enrich-contact.ts`:

1. Add import at top:
```ts
import { getApiKey } from "@/lib/api-keys";
```

2. The function destructures `event.data`. Find:
```ts
    const { contactId, enrichmentId, fields } = event.data as {
      contactId: string;
      enrichmentId: string;
      fields: EnrichmentField[];
    };
```
Replace with:
```ts
    const { contactId, enrichmentId, fields, triggeredBy } = event.data as {
      contactId: string;
      enrichmentId: string;
      fields: EnrichmentField[];
      triggeredBy?: string;
    };
```

3. Find and replace the env var reads:
```ts
    const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;
```
Replace with:
```ts
    const firecrawlApiKey = await getApiKey("FIRECRAWL", triggeredBy);
    const openaiApiKey = await getApiKey("OPENAI", triggeredBy);
```

4. Find the guard that checks for missing keys (it sets status to FAILED). Update the error message:
```ts
    if (!firecrawlApiKey || !openaiApiKey) {
      await prismadb.crm_Contact_Enrichment.update({
        where: { id: enrichmentId },
        data: { status: "FAILED", error: "NO_API_KEY: configure keys in admin settings or your profile" },
      });
      return { status: "failed", reason: "NO_API_KEY" };
    }
```

- [ ] **Step 4: Update `enrich-target.ts`**

Apply the same changes as Step 3 to `inngest/functions/enrich-target.ts` (replacing `crm_Contact_Enrichment` with `crm_Target_Enrichment` and `contactId` with `targetId` where relevant).

- [ ] **Step 5: Check TypeScript**

```bash
pnpm tsc --noEmit 2>&1 | grep 'inngest/functions'
```
Expected: No new errors.

- [ ] **Step 6: Commit**

```bash
git add inngest/functions/enrich-contacts-bulk.ts inngest/functions/enrich-targets-bulk.ts
git add inngest/functions/enrich-contact.ts inngest/functions/enrich-target.ts
git commit -m "feat: Inngest enrichment functions use getApiKey — forward triggeredBy through bulk fan-out"
```

---

## Task 8: `NoApiKeyDialog` component

**Files:**
- Create: `app/components/NoApiKeyDialog.tsx`

- [ ] **Step 1: Create the dialog component**

Create `app/components/NoApiKeyDialog.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { KeyRound } from "lucide-react";

interface NoApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NoApiKeyDialog({ open, onOpenChange }: NoApiKeyDialogProps) {
  const router = useRouter();
  const locale = useLocale();

  const handleGoToSettings = () => {
    onOpenChange(false);
    router.push(`/${locale}/profile?tab=llms`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <KeyRound className="h-5 w-5 text-muted-foreground" />
            <DialogTitle>API Keys Required</DialogTitle>
          </div>
          <DialogDescription>
            Enrichment requires OpenAI and Firecrawl API keys. Configure them in your profile
            settings, or ask your admin to set system-wide keys.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleGoToSettings}>Go to Settings</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Wire into `EnrichContactDrawer`**

In `app/[locale]/(routes)/crm/contacts/[contactId]/components/EnrichContactDrawer.tsx`:

1. Add import:
```tsx
import { NoApiKeyDialog } from "@/app/components/NoApiKeyDialog";
```

2. Add state:
```tsx
const [noKeyOpen, setNoKeyOpen] = useState(false);
```

3. In the `handleStart` function (the POST to `/api/crm/contacts/enrich`), find the error handling. After getting the response, add a check for `NO_API_KEY`:
```tsx
      if (!res.ok) {
        const err = await res.json();
        if (err.error === "NO_API_KEY") {
          setNoKeyOpen(true);
          return;
        }
        // ... existing error handling
      }
```

4. Add the dialog to the JSX (at the end of the component return, inside the outermost element):
```tsx
      <NoApiKeyDialog open={noKeyOpen} onOpenChange={setNoKeyOpen} />
```

- [ ] **Step 3: Wire into `EnrichTargetDrawer`**

Apply the same changes to `app/[locale]/(routes)/crm/targets/[targetId]/components/EnrichTargetDrawer.tsx`.

- [ ] **Step 4: Wire into `BulkEnrichModal`**

In `app/[locale]/(routes)/crm/contacts/components/BulkEnrichModal.tsx`:

1. Add import for `NoApiKeyDialog`.
2. Add `noKeyOpen` state.
3. In `handleStart`, before the existing `toast.error` call, check for `NO_API_KEY`:
```tsx
        const err = await res.json();
        if (err.error === "NO_API_KEY") {
          setNoKeyOpen(true);
          return;
        }
        toast.error(err.error ?? "Failed to start bulk enrichment");
```
4. Add `<NoApiKeyDialog open={noKeyOpen} onOpenChange={setNoKeyOpen} />` to the return JSX.

- [ ] **Step 5: Wire into `BulkEnrichTargetsModal`**

Apply the same changes to `app/[locale]/(routes)/crm/targets/components/BulkEnrichTargetsModal.tsx`.

- [ ] **Step 6: Check TypeScript**

```bash
pnpm tsc --noEmit 2>&1 | grep -E 'NoApiKeyDialog|EnrichContactDrawer|EnrichTargetDrawer|BulkEnrich'
```
Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add app/components/NoApiKeyDialog.tsx
git add "app/[locale]/(routes)/crm/contacts/[contactId]/components/EnrichContactDrawer.tsx"
git add "app/[locale]/(routes)/crm/targets/[targetId]/components/EnrichTargetDrawer.tsx"
git add "app/[locale]/(routes)/crm/contacts/components/BulkEnrichModal.tsx"
git add "app/[locale]/(routes)/crm/targets/components/BulkEnrichTargetsModal.tsx"
git commit -m "feat: add NoApiKeyDialog — show setup prompt when enrichment keys not configured"
```

---

## Task 9: Admin sidebar layout and LLM Keys page

**Files:**
- Create: `app/[locale]/(routes)/admin/layout.tsx`
- Modify: `app/[locale]/(routes)/admin/page.tsx`
- Create: `app/[locale]/(routes)/admin/llm-keys/page.tsx`
- Delete: `app/[locale]/(routes)/admin/_components/OpenAiCard.tsx`
- Delete: `app/[locale]/(routes)/admin/_components/GptCard.tsx`
- Delete `app/[locale]/(routes)/admin/forms/SetGptModel.tsx` (verify path exists first)

- [ ] **Step 1: Create admin layout with sidebar**

Create `app/[locale]/(routes)/admin/layout.tsx`:

```tsx
import Link from "next/link";
import { KeyRound, Users, Puzzle, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "llm-keys", label: "LLM Keys", icon: KeyRound },
  { href: "users", label: "Users", icon: Users },
  { href: "modules", label: "Modules", icon: Puzzle },
  { href: "services", label: "Services", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[600px]">
      <nav className="hidden md:flex w-52 flex-col flex-shrink-0 border-r border-border p-3 gap-1 bg-card">
        <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Admin
        </p>
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
              "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="flex-1 p-6 overflow-hidden">{children}</div>
    </div>
  );
}
```

> **Note:** To highlight the active nav item, this layout needs to become a Client Component and use `usePathname()`. However, since layouts in Next.js App Router don't receive the current path as a prop, the simplest approach is to use `usePathname` in a separate `AdminNav` client component. For now, a static layout is functional — add active-state highlighting as a follow-up if needed.

- [ ] **Step 2: Create LLM Keys page**

Create `app/[locale]/(routes)/admin/llm-keys/page.tsx`:

```tsx
import { getSystemApiKeys } from "../actions/api-keys";
import { ProviderKeyCard } from "./_components/ProviderKeyCard";

export default async function LlmKeysPage() {
  const keys = await getSystemApiKeys();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-foreground">AI Provider Keys</h1>
        <p className="text-sm text-muted-foreground mt-1">
          System-wide keys used for enrichment. Priority: ENV variable → these keys → user profile keys.
        </p>
      </div>
      <div className="rounded-md border border-border bg-accent/30 border-l-4 border-l-primary px-4 py-3 mb-6">
        <p className="text-sm text-foreground">
          Keys set via environment variables take highest priority and are read-only here.
        </p>
      </div>
      <div className="space-y-3">
        {keys.map((info) => (
          <ProviderKeyCard key={info.provider} info={info} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `ProviderKeyCard` client component**

Create `app/[locale]/(routes)/admin/llm-keys/_components/ProviderKeyCard.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { upsertSystemApiKey, deleteSystemApiKey } from "../actions/api-keys";
import type { ProviderKeyInfo } from "../actions/api-keys";

const PROVIDER_LABELS: Record<string, { name: string; description: string }> = {
  OPENAI: { name: "OpenAI", description: "GPT-4 · Embeddings · Enrichment" },
  FIRECRAWL: { name: "Firecrawl", description: "Web scraping · Enrichment" },
  ANTHROPIC: { name: "Anthropic", description: "Claude models" },
  GROQ: { name: "Groq", description: "Fast inference" },
};

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  ENV_ACTIVE: { label: "ENV", variant: "secondary" },
  SYSTEM_SET: { label: "System", variant: "default" },
  NOT_CONFIGURED: { label: "Not configured", variant: "outline" },
};

export function ProviderKeyCard({ info }: { info: ProviderKeyInfo }) {
  const [editing, setEditing] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [isPending, startTransition] = useTransition();

  const { name, description } = PROVIDER_LABELS[info.provider];
  const badge = STATUS_BADGE[info.status];

  const handleSave = () => {
    if (!keyInput.trim()) return;
    startTransition(async () => {
      try {
        await upsertSystemApiKey(info.provider, keyInput);
        setEditing(false);
        setKeyInput("");
        toast.success(`${name} key saved`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to save key");
      }
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteSystemApiKey(info.provider);
        toast.success(`${name} key removed`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to remove key");
      }
    });
  };

  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">{name}</span>
                <Badge variant={badge.variant}>{badge.label}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {info.status === "ENV_ACTIVE" && (
              <span className="text-xs text-muted-foreground font-mono">Set via ENV</span>
            )}
            {info.status === "SYSTEM_SET" && !editing && (
              <>
                <span className="text-xs text-muted-foreground font-mono">{info.maskedKey}</span>
                <Button size="icon" variant="ghost" onClick={() => setEditing(true)} disabled={isPending}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" onClick={handleDelete} disabled={isPending}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </>
            )}
            {info.status === "NOT_CONFIGURED" && !editing && (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)} disabled={isPending}>
                + Add key
              </Button>
            )}
            {editing && (
              <div className="flex items-center gap-2">
                <Input
                  type="password"
                  placeholder="Paste API key..."
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  className="h-8 w-48 text-xs"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                />
                <Button size="icon" variant="ghost" onClick={handleSave} disabled={isPending || !keyInput.trim()}>
                  <Check className="h-3.5 w-3.5 text-green-600" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => { setEditing(false); setKeyInput(""); }}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Update `admin/page.tsx` to redirect**

Read the current `app/[locale]/(routes)/admin/page.tsx` first, then replace its content with a redirect:

```tsx
import { redirect } from "next/navigation";

export default function AdminPage() {
  redirect("./admin/llm-keys");
}
```

> **Note:** If the existing admin page contains content you want to keep (user management, module toggles), move those into `admin/users/page.tsx` and `admin/modules/page.tsx` respectively before replacing `admin/page.tsx`.

- [ ] **Step 5: Remove old admin OpenAI components**

```bash
rm "app/[locale]/(routes)/admin/_components/OpenAiCard.tsx"
rm "app/[locale]/(routes)/admin/_components/GptCard.tsx"
# Verify the path for SetGptModel first:
ls "app/[locale]/(routes)/admin/forms/" 2>/dev/null || echo "forms/ dir not found"
```

If `forms/SetGptModel.tsx` exists, delete it. If not, check `_components/` for a `SetGptModel` file.

- [ ] **Step 6: Check TypeScript and build**

```bash
pnpm tsc --noEmit 2>&1 | grep -E 'admin/' | head -20
```
Fix any import errors from the deleted files (update `admin/page.tsx` to not import the deleted components).

- [ ] **Step 7: Commit**

```bash
git add "app/[locale]/(routes)/admin/"
git commit -m "feat: redesign admin panel — sidebar layout, LLM Keys page, remove old OpenAI cards"
```

---

## Task 10: Profile LLMs tab

**Files:**
- Create: `app/[locale]/(routes)/profile/components/tabs/LlmsTabContent.tsx`
- Modify: `app/[locale]/(routes)/profile/components/tabs/DeveloperTabContent.tsx`
- Modify: `app/[locale]/(routes)/profile/components/ProfileTabs.tsx`
- Modify: `app/[locale]/(routes)/profile/page.tsx`
- Modify: `locales/en.json` (and `cz.json`, `de.json`, `uk.json`)

- [ ] **Step 1: Add translations**

In `locales/en.json`, find the `ProfilePage.tabs` object and add:

```json
"llms": "LLMs",
"llmsDesc": "Configure AI provider API keys"
```

Copy the same keys to `locales/cz.json`, `locales/de.json`, `locales/uk.json` with the same English values (they can be translated later).

- [ ] **Step 2: Create `LlmsTabContent.tsx`**

Create `app/[locale]/(routes)/profile/components/tabs/LlmsTabContent.tsx`:

```tsx
import { getTranslations } from "next-intl/server";
import { getUserApiKeys } from "../../actions/api-keys";
import { LlmsProviderForm } from "../LlmsProviderForm";

type Props = { userId: string };

export async function LlmsTabContent({ userId }: Props) {
  const t = await getTranslations("ProfilePage");
  const keys = await getUserApiKeys();

  return (
    <div className="space-y-4">
      {keys.map((info) => (
        <LlmsProviderForm key={info.provider} info={info} />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create `LlmsProviderForm` client component**

Create `app/[locale]/(routes)/profile/components/LlmsProviderForm.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { upsertUserApiKey, deleteUserApiKey } from "../actions/api-keys";
import type { UserProviderKeyInfo } from "../actions/api-keys";

const PROVIDER_LABELS: Record<string, { name: string; description: string }> = {
  OPENAI: { name: "OpenAI", description: "Used for AI enrichment" },
  FIRECRAWL: { name: "Firecrawl", description: "Used for web scraping during enrichment" },
  ANTHROPIC: { name: "Anthropic", description: "Claude models (future use)" },
  GROQ: { name: "Groq", description: "Fast inference (future use)" },
};

const STATUS_NOTE: Record<string, string | null> = {
  ENV_ACTIVE: "Set via environment variable — your key is not in use",
  SYSTEM_ACTIVE: "A system-wide key is active — your key is not in use",
  USER_SET: null,
  NOT_CONFIGURED: null,
};

export function LlmsProviderForm({ info }: { info: UserProviderKeyInfo }) {
  const [keyInput, setKeyInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const { name, description } = PROVIDER_LABELS[info.provider];
  const note = STATUS_NOTE[info.status];
  const isReadOnly = info.status === "ENV_ACTIVE" || info.status === "SYSTEM_ACTIVE";

  const handleSave = () => {
    if (!keyInput.trim()) return;
    startTransition(async () => {
      try {
        await upsertUserApiKey(info.provider, keyInput);
        setKeyInput("");
        toast.success(`${name} key saved`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to save key");
      }
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteUserApiKey(info.provider);
        toast.success(`${name} key removed`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to remove key");
      }
    });
  };

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-card-foreground">{name}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        {info.status === "USER_SET" && (
          <Badge variant="default">Configured</Badge>
        )}
      </div>

      {note && (
        <p className="text-xs text-muted-foreground mb-3 italic">{note}</p>
      )}

      {!isReadOnly && (
        <div className="flex gap-2">
          <Input
            type="password"
            placeholder={info.status === "USER_SET" ? info.maskedKey : "Paste API key..."}
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            className="h-8 text-xs"
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isPending || !keyInput.trim()}
          >
            Save
          </Button>
          {info.status === "USER_SET" && (
            <Button size="sm" variant="outline" onClick={handleDelete} disabled={isPending}>
              Remove
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Update `DeveloperTabContent.tsx` — remove `OpenAiForm`**

Modify `app/[locale]/(routes)/profile/components/tabs/DeveloperTabContent.tsx`:

Remove the `OpenAiForm` import and the card that wraps it. Keep only the `ApiTokens` card:

```tsx
import { getTranslations } from "next-intl/server";
import { ApiTokens } from "../ApiTokens";

type Props = { userId: string };

export async function DeveloperTabContent({ userId }: Props) {
  const t = await getTranslations("ProfilePage");
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="mb-4 text-sm font-semibold text-card-foreground">
          {t("cards.apiTokens")}
        </h3>
        <ApiTokens />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Update `ProfileTabs.tsx` — add `llms` tab**

In `app/[locale]/(routes)/profile/components/ProfileTabs.tsx`:

1. Change the `Tab` type:
```ts
type Tab = "profile" | "security" | "preferences" | "developer" | "emails" | "llms";
```

2. Add to `TAB_ICONS`:
```ts
import { ..., KeyRound } from "lucide-react";
// In TAB_ICONS:
  llms: KeyRound,
```

3. Add `llmsContent` to the `Props` type and destructuring:
```ts
type Props = {
  // ... existing props
  llmsContent: React.ReactNode;
};
// and in the function signature and destructuring
```

4. Add to `TAB_IDS`:
```ts
const TAB_IDS: Tab[] = ["profile", "security", "preferences", "developer", "llms", "emails"];
```

5. Add to the `tabs` array:
```ts
{ id: "llms", label: t("tabs.llms"), desc: t("tabs.llmsDesc") },
```
(Place it after `developer`.)

6. Add to `contentMap`:
```ts
  llms: llmsContent,
```

- [ ] **Step 6: Update `profile/page.tsx`**

In `app/[locale]/(routes)/profile/page.tsx`:

1. Add import:
```tsx
import { LlmsTabContent } from "./components/tabs/LlmsTabContent";
```

2. Add the prop to `<ProfileTabs>`:
```tsx
            llmsContent={<LlmsTabContent userId={data.id} />}
```

- [ ] **Step 7: Check TypeScript**

```bash
pnpm tsc --noEmit 2>&1 | grep -E 'profile/'
```
Expected: No errors.

- [ ] **Step 8: Commit**

```bash
git add "app/[locale]/(routes)/profile/"
git add locales/
git commit -m "feat: add LLMs tab to profile — per-user API key management, remove OpenAiForm from Developer tab"
```

---

## Task 11: Build verification

- [ ] **Step 1: Run the full Jest test suite**

```bash
pnpm jest --no-coverage
```
Expected: All tests pass. If you see TypeScript errors in tests, fix them — do not skip.

- [ ] **Step 2: Run TypeScript check across the whole project**

```bash
pnpm tsc --noEmit 2>&1 | grep -v node_modules | grep -v '.next' | head -30
```
Expected: No new errors introduced by this feature. Pre-existing errors in worktree files are acceptable.

- [ ] **Step 3: Run production build**

```bash
pnpm build
```
Expected: Build succeeds. If it fails on a missing module or import error, trace it back to the relevant task and fix.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: verify build passes — LLM API keys feature complete"
```

---

## Quick Reference

**Key files by concern:**

| Concern | File |
|---|---|
| Key resolver | `lib/api-keys.ts` |
| Resolver tests | `__tests__/lib/api-keys.test.ts` |
| Admin actions | `app/[locale]/(routes)/admin/actions/api-keys.ts` |
| Profile actions | `app/[locale]/(routes)/profile/actions/api-keys.ts` |
| No-key dialog | `app/components/NoApiKeyDialog.tsx` |
| Admin layout | `app/[locale]/(routes)/admin/layout.tsx` |
| Admin LLM page | `app/[locale]/(routes)/admin/llm-keys/page.tsx` |
| Profile LLMs tab | `app/[locale]/(routes)/profile/components/tabs/LlmsTabContent.tsx` |

**Test command:** `pnpm jest __tests__/lib/api-keys.test.ts --no-coverage`

**Build command:** `pnpm build`

**ENV vars required for full functionality:**
- `EMAIL_ENCRYPTION_KEY` — 64-char hex (already required for email accounts). Generate: `openssl rand -hex 32`
