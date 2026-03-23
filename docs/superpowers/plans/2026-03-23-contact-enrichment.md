# Contact Enrichment via Firecrawl — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let NextCRM users enrich contact records with company data (industry, LinkedIn, funding stage, tech stack, etc.) using the fire-enrich multi-agent engine powered by Firecrawl + GPT-4o — both one-at-a-time with a live progress drawer, and in bulk via Inngest background jobs.

**Architecture:** Copy fire-enrich's `lib/` into `lib/enrichment/`. A streaming SSE route handles single-contact enrichment with real-time agent progress; a separate bulk route fans out to Inngest jobs. The drawer shows a diff preview before saving; bulk auto-applies to empty fields only.

**Tech Stack:** Next.js App Router, Prisma + PostgreSQL, Inngest, `@mendable/firecrawl-js`, OpenAI (already present), Zod (already present), Tailwind + shadcn/ui, TanStack Table (already present).

**Note on drawer component:** The spec says "slide-over drawer" — this maps to shadcn `Sheet` (slides in from the right). `vaul` is a bottom-sheet library for mobile and is NOT used here. `Sheet` is the correct choice.

**TDD note:** Every task that introduces logic follows the pattern: write failing test → run → implement → run → commit. The SSE route's validation logic is tested in Task 5 steps 1–4 before the route itself is written in step 5.

**Spec:** `docs/superpowers/specs/2026-03-23-contact-enrichment-design.md`

---

## File Map

**New files:**
- `lib/enrichment/` — copied from fire-enrich `lib/` (agent-architecture, strategies, services, types, utils, config)
- `lib/enrichment/types/stored-result.ts` — shared `StoredEnrichmentResult` type
- `app/api/crm/contacts/enrich/route.ts` — SSE stream + cancel endpoint
- `app/api/crm/contacts/enrich-bulk/route.ts` — triggers Inngest bulk fan-out
- `inngest/functions/enrich-contacts-bulk.ts` — fan-out function
- `inngest/functions/enrich-contact.ts` — per-contact Inngest job
- `app/[locale]/(routes)/crm/contacts/components/EnrichFieldSelector.tsx` — shared field picker
- `app/[locale]/(routes)/crm/contacts/[contactId]/components/EnrichContactDrawer.tsx` — single contact drawer
- `app/[locale]/(routes)/crm/contacts/components/BulkEnrichModal.tsx` — bulk field selector modal
- `app/[locale]/(routes)/crm/contacts/enrichment/page.tsx` — jobs status page (Server Component)
- `app/[locale]/(routes)/crm/contacts/enrichment/RetryButton.tsx` — retry action (Client Component)
- `tests/enrichment/utils.test.ts` — unit tests for enrichment utilities
- `tests/enrichment/enrich-contact-job.test.ts` — unit tests for Inngest job logic
- `tests/enrichment/enrich-route.test.ts` — integration tests for SSE route validation logic

**Modified files:**
- `prisma/schema.prisma` — add `crm_Contact_Enrichment` model + relations
- `app/api/inngest/route.ts` — register two new Inngest functions
- `app/[locale]/(routes)/crm/contacts/[contactId]/components/BasicView.tsx` — add Enrich button
- `app/[locale]/(routes)/crm/contacts/table-components/columns.tsx` — add checkbox selection column
- `app/[locale]/(routes)/crm/contacts/table-components/data-table-toolbar.tsx` — add bulk enrich toolbar
- `.env.example` — add `FIRECRAWL_API_KEY`

---

## Task 1: Install dependency + env var

**Files:**
- Modify: `package.json`
- Modify: `.env.example`

- [ ] **Step 1: Install @mendable/firecrawl-js**

```bash
cd /Users/pavel-clawdbot/.openclaw/workspace-chopper/development/nextcrm-app
pnpm add @mendable/firecrawl-js@^1.25.1
```

Expected: package added, `pnpm-lock.yaml` updated.

- [ ] **Step 2: Add env var to .env.example**

In `.env.example`, add after the existing OpenAI entry:
```
# Firecrawl (contact enrichment)
FIRECRAWL_API_KEY=            # get from https://firecrawl.dev
```

- [ ] **Step 3: Verify TypeScript can import**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors about `@mendable/firecrawl-js`.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml .env.example
git commit -m "chore: add @mendable/firecrawl-js dependency for contact enrichment"
```

---

## Task 2: Copy fire-enrich lib into lib/enrichment/

**Files:**
- Create: `lib/enrichment/` (full directory copy)
- Create: `lib/enrichment/types/stored-result.ts`

- [ ] **Step 1: Copy the lib directory**

```bash
cp -r /Users/pavel-clawdbot/.openclaw/workspace-chopper/development/fire-enrich/lib/ \
  /Users/pavel-clawdbot/.openclaw/workspace-chopper/development/nextcrm-app/lib/enrichment/
```

- [ ] **Step 2: Check and fix import aliases**

Fire-enrich uses relative imports within `lib/`, so this is usually a no-op. Verify:

```bash
cd /Users/pavel-clawdbot/.openclaw/workspace-chopper/development/nextcrm-app
grep -r "from '@/lib/" lib/enrichment/ --include="*.ts"
```

Expected: no output (fire-enrich already uses relative imports like `'../services/firecrawl'`).

If output IS found (imports like `from '@/lib/services/firecrawl'`), fix them with a portable node script:

```bash
node -e "
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const files = glob.sync('lib/enrichment/**/*.ts');
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  if (content.includes(\"from '@/lib/\")) {
    fs.writeFileSync(f, content.replace(/from '@\\/lib\\//g, \"from '@/lib/enrichment/\"));
    console.log('fixed:', f);
  }
});
"
```

Then verify: `npx tsc --noEmit 2>&1 | grep enrichment`

- [ ] **Step 3: Create StoredEnrichmentResult type**

Create `lib/enrichment/types/stored-result.ts`:

```typescript
import type { EnrichmentResult } from "./index";

/**
 * Shape stored in crm_Contact_Enrichment.result JSON field.
 * Also the shape returned by the SSE 'result' event for the diff preview.
 */
export interface StoredEnrichmentResult {
  enrichments: Record<string, EnrichmentResult>;
  status: "completed" | "error" | "skipped";
  error?: string;
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "lib/enrichment" | head -20
```

Expected: no errors from `lib/enrichment/`. Fix any import path issues found.

- [ ] **Step 5: Commit**

```bash
git add lib/enrichment/
git commit -m "feat: copy fire-enrich lib into lib/enrichment/"
```

---

## Task 3: Prisma schema + migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add model to schema**

In `prisma/schema.prisma`, add after the `crm_Leads` model:

```prisma
model crm_Contact_Enrichment {
  id          String                  @id @default(uuid()) @db.Uuid
  contactId   String                  @db.Uuid
  status      crm_Enrichment_Status   @default(PENDING)
  fields      String[]
  result      Json?
  error       String?
  triggeredBy String?                 @db.Uuid
  createdAt   DateTime                @default(now())
  updatedAt   DateTime                @updatedAt

  contact           crm_Contacts      @relation(fields: [contactId], references: [id])
  triggered_by_user Users?            @relation("enrichment_triggered_by", fields: [triggeredBy], references: [id])

  @@index([contactId])
  @@index([status])
  @@index([createdAt])
  @@index([triggeredBy])
}

enum crm_Enrichment_Status {
  PENDING
  RUNNING
  COMPLETED
  FAILED
  SKIPPED
}
```

- [ ] **Step 2: Add back-relations**

In the `crm_Contacts` model block, add:
```prisma
enrichments   crm_Contact_Enrichment[]
```

In the `Users` model block, add:
```prisma
enrichments_triggered  crm_Contact_Enrichment[]  @relation("enrichment_triggered_by")
```

- [ ] **Step 3: Generate + verify migration**

```bash
pnpm prisma migrate dev --name add-contact-enrichment
```

Expected: migration file created in `prisma/migrations/`, Prisma client regenerated.

- [ ] **Step 4: Verify Prisma client types exist**

```bash
npx tsc --noEmit 2>&1 | head -10
```

Expected: no errors. `prismadb.crm_Contact_Enrichment` should now be available.

- [ ] **Step 5: Commit**

```bash
git add prisma/
git commit -m "feat: add crm_Contact_Enrichment model and migration"
```

---

## Task 4: Write tests for enrichment utilities

**Files:**
- Create: `tests/enrichment/utils.test.ts`

These test pure utility logic before writing the Inngest job.

- [ ] **Step 1: Write failing tests**

Create `tests/enrichment/utils.test.ts`:

```typescript
import { isFieldEmpty } from "@/lib/enrichment/utils/field-utils";

describe("isFieldEmpty", () => {
  it("returns true for null", () => {
    expect(isFieldEmpty(null)).toBe(true);
  });

  it("returns true for empty string", () => {
    expect(isFieldEmpty("")).toBe(true);
  });

  it("returns true for whitespace-only string", () => {
    expect(isFieldEmpty("   ")).toBe(true);
  });

  it("returns false for a real value", () => {
    expect(isFieldEmpty("Developer Tools")).toBe(false);
  });

  it("returns false for a string with only spaces around real content", () => {
    expect(isFieldEmpty("  real value  ")).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

```bash
pnpm jest tests/enrichment/utils.test.ts --no-coverage
```

Expected: FAIL — `isFieldEmpty` not found.

- [ ] **Step 3: Check if field-utils.ts already exists**

```bash
cat lib/enrichment/utils/field-utils.ts
```

If `isFieldEmpty` already exists with a different name or is missing, add it:

In `lib/enrichment/utils/field-utils.ts`, add:

```typescript
/**
 * A contact field is considered empty if null or blank string after trimming.
 * Used by bulk enrichment to avoid overwriting existing data.
 */
export function isFieldEmpty(value: string | null | undefined): boolean {
  if (value === null || value === undefined) return true;
  return value.trim() === "";
}
```

- [ ] **Step 4: Run to verify they pass**

```bash
pnpm jest tests/enrichment/utils.test.ts --no-coverage
```

Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/enrichment/utils/field-utils.ts tests/enrichment/utils.test.ts
git commit -m "test: add isFieldEmpty utility and tests"
```

---

## Task 5: SSE enrichment API route (single contact)

**Files:**
- Create: `tests/enrichment/enrich-route.test.ts`
- Create: `app/api/crm/contacts/enrich/route.ts`

- [ ] **Step 1: Write failing validation tests**

Create `tests/enrichment/enrich-route.test.ts`:

```typescript
// Tests for the pure validation logic extracted from the route.
// SSE streaming itself is not unit-testable; validated via smoke test in Task 13.
import { validateEnrichRequest } from "@/app/api/crm/contacts/enrich/validate";

describe("validateEnrichRequest", () => {
  it("returns error when contactId missing", () => {
    const result = validateEnrichRequest({ contactId: "", fields: [{ name: "industry" }] });
    expect(result).toBe("contactId and fields are required");
  });

  it("returns error when fields is empty array", () => {
    const result = validateEnrichRequest({ contactId: "abc", fields: [] });
    expect(result).toBe("contactId and fields are required");
  });

  it("returns null when valid", () => {
    const result = validateEnrichRequest({ contactId: "abc", fields: [{ name: "industry" }] });
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify they fail**

```bash
pnpm jest tests/enrichment/enrich-route.test.ts --no-coverage
```

Expected: FAIL — `validateEnrichRequest` not found.

- [ ] **Step 3: Create the validation helper**

Create `app/api/crm/contacts/enrich/validate.ts`:

```typescript
export function validateEnrichRequest(body: { contactId?: string; fields?: unknown[] }): string | null {
  if (!body.contactId || !body.fields?.length) {
    return "contactId and fields are required";
  }
  return null;
}
```

- [ ] **Step 4: Run to verify tests pass**

```bash
pnpm jest tests/enrichment/enrich-route.test.ts --no-coverage
```

Expected: PASS (3 tests).

- [ ] **Step 5: Create the SSE route**

Create `app/api/crm/contacts/enrich/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prismadb } from "@/lib/prisma";
import { AgentEnrichmentStrategy } from "@/lib/enrichment/strategies/agent-enrichment-strategy";
import type { EnrichmentField } from "@/lib/enrichment/types";
import type { StoredEnrichmentResult } from "@/lib/enrichment/types/stored-result";
import { validateEnrichRequest } from "./validate";

export const runtime = "nodejs";

// In-memory session map: sessionId → { abortController, enrichmentId }
const activeSessions = new Map<string, { controller: AbortController; enrichmentId: string }>();

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!firecrawlApiKey || !openaiApiKey) {
    return NextResponse.json(
      { error: "Enrichment is not configured. Set FIRECRAWL_API_KEY and OPENAI_API_KEY." },
      { status: 503 }
    );
  }

  const body = await request.json();
  const validationError = validateEnrichRequest(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }
  const { contactId, fields } = body as { contactId: string; fields: EnrichmentField[] };

  const contact = await prismadb.crm_Contacts.findUnique({
    where: { id: contactId },
    select: { id: true, email: true },
  });

  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  if (!contact.email) {
    return NextResponse.json(
      { error: "Contact has no email. Add an email to enable enrichment." },
      { status: 422 }
    );
  }

  // Create enrichment record
  const enrichmentRecord = await prismadb.crm_Contact_Enrichment.create({
    data: {
      contactId,
      status: "RUNNING",
      fields: fields.map((f) => f.name),
      triggeredBy: session.user.id,
    },
  });

  const sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const abortController = new AbortController();
  activeSessions.set(sessionId, { controller: abortController, enrichmentId: enrichmentRecord.id });

  // Cancel on client disconnect
  request.signal.addEventListener("abort", () => {
    abortController.abort();
  });

  const encoder = new TextEncoder();
  const strategy = new AgentEnrichmentStrategy(openaiApiKey, firecrawlApiKey);

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (data: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

      try {
        enqueue({ type: "session", sessionId });

        const result = await strategy.enrichRow(
          { email: contact.email! },
          fields,
          "email",
          undefined,
          (message: string, type: string, sourceUrl?: string) => {
            enqueue({ type: "agent_progress", message, messageType: type, sourceUrl });
          }
        );

        const stored: StoredEnrichmentResult = {
          enrichments: result.enrichments,
          status: result.status as "completed" | "error" | "skipped",
          error: result.error,
        };

        await prismadb.crm_Contact_Enrichment.update({
          where: { id: enrichmentRecord.id },
          data: { status: "COMPLETED", result: stored as any },
        });

        enqueue({ type: "result", result: stored, enrichmentId: enrichmentRecord.id });
        enqueue({ type: "complete" });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        await prismadb.crm_Contact_Enrichment.update({
          where: { id: enrichmentRecord.id },
          data: { status: "FAILED", error: message },
        }).catch(() => {});
        enqueue({ type: "error", error: message });
      } finally {
        activeSessions.delete(sessionId);
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// ---- CANCEL ENDPOINT (DELETE /api/crm/contacts/enrich?sessionId=...) ----
// Required by spec — called by drawer Cancel button and on SSE connection drop.
export async function DELETE(request: NextRequest) {
  const sessionId = new URL(request.url).searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const entry = activeSessions.get(sessionId);
  if (!entry) {
    return NextResponse.json({ error: "Session not found or already complete" }, { status: 404 });
  }

  entry.controller.abort();
  activeSessions.delete(sessionId);

  await prismadb.crm_Contact_Enrichment.update({
    where: { id: entry.enrichmentId },
    data: { status: "FAILED", error: "Cancelled by user" },
  }).catch(() => {});

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Check TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "contacts/enrich" | head -20
```

Expected: no errors. Fix any import issues.

- [ ] **Step 3: Verify route is accessible**

```bash
curl -s -X POST http://localhost:3000/api/crm/contacts/enrich \
  -H "Content-Type: application/json" \
  -d '{"contactId":"test","fields":[]}' | head -5
```

Expected: JSON error response (401 unauthorized — no session in curl). This confirms the route exists.

- [ ] **Step 6: Commit**

```bash
git add app/api/crm/contacts/enrich/route.ts \
  app/api/crm/contacts/enrich/validate.ts \
  tests/enrichment/enrich-route.test.ts
git commit -m "feat: add SSE contact enrichment API route with validation tests"
```

---

## Task 6: Write tests for Inngest enrich-contact job logic

**Files:**
- Create: `tests/enrichment/enrich-contact-job.test.ts`

These test the skip/dedup logic before implementing the function.

- [ ] **Step 1: Write failing tests**

Create `tests/enrichment/enrich-contact-job.test.ts`:

```typescript
import { shouldSkipBulkEnrichment } from "@/inngest/functions/enrich-contact";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

describe("shouldSkipBulkEnrichment", () => {
  it("returns false when no recent completed record exists", () => {
    expect(shouldSkipBulkEnrichment(null)).toBe(false);
  });

  it("returns true when completed record is within last 7 days", () => {
    const recentDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
    expect(shouldSkipBulkEnrichment(recentDate)).toBe(true);
  });

  it("returns false when completed record is older than 7 days", () => {
    const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000); // 8 days ago
    expect(shouldSkipBulkEnrichment(oldDate)).toBe(false);
  });

  it("returns false exactly at the 7-day boundary", () => {
    const exactDate = new Date(Date.now() - SEVEN_DAYS_MS - 1000); // just over 7 days
    expect(shouldSkipBulkEnrichment(exactDate)).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

```bash
pnpm jest tests/enrichment/enrich-contact-job.test.ts --no-coverage
```

Expected: FAIL — `shouldSkipBulkEnrichment` not found.

- [ ] **Step 3: Implement enrich-contact Inngest function**

Create `inngest/functions/enrich-contact.ts`:

```typescript
import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { AgentEnrichmentStrategy } from "@/lib/enrichment/strategies/agent-enrichment-strategy";
import { isFieldEmpty } from "@/lib/enrichment/utils/field-utils";
import type { EnrichmentField } from "@/lib/enrichment/types";
import type { StoredEnrichmentResult } from "@/lib/enrichment/types/stored-result";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Exported for unit testing.
 * Returns true if a contact was successfully enriched within the last 7 days.
 */
export function shouldSkipBulkEnrichment(lastCompletedAt: Date | null): boolean {
  if (!lastCompletedAt) return false;
  return Date.now() - lastCompletedAt.getTime() < SEVEN_DAYS_MS;
}

// Contact fields that can be enriched, mapped to crm_Contacts column names
const ENRICHABLE_FIELDS: Record<string, keyof typeof contactFieldMap> = {};
const contactFieldMap = {
  company_name: "description", // stored in description as company context
  industry: "description",
  position: "position",
  website: "website",
  social_linkedin: "social_linkedin",
  social_twitter: "social_twitter",
  description: "description",
} as const;

export const enrichContact = inngest.createFunction(
  {
    id: "enrich-contact",
    name: "Enrich Contact",
    triggers: [{ event: "enrich/contact.run" }],
    retries: 3,
  },
  async ({ event }) => {
    const { contactId, enrichmentId, fields } = event.data as {
      contactId: string;
      enrichmentId: string;
      fields: EnrichmentField[];
    };

    const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;

    // Mark as running
    await prismadb.crm_Contact_Enrichment.update({
      where: { id: enrichmentId },
      data: { status: "RUNNING" },
    });

    // Fetch contact
    const contact = await prismadb.crm_Contacts.findUnique({
      where: { id: contactId },
      select: {
        id: true,
        email: true,
        position: true,
        website: true,
        social_linkedin: true,
        social_twitter: true,
        description: true,
      },
    });

    if (!contact?.email) {
      await prismadb.crm_Contact_Enrichment.update({
        where: { id: enrichmentId },
        data: { status: "SKIPPED", error: "No email on contact" },
      });
      return { skipped: "no email" };
    }

    // 7-day dedup check
    const recentEnrichment = await prismadb.crm_Contact_Enrichment.findFirst({
      where: {
        contactId,
        status: "COMPLETED",
        createdAt: { gte: new Date(Date.now() - SEVEN_DAYS_MS) },
      },
      select: { createdAt: true },
    });

    if (shouldSkipBulkEnrichment(recentEnrichment?.createdAt ?? null)) {
      await prismadb.crm_Contact_Enrichment.update({
        where: { id: enrichmentId },
        data: { status: "SKIPPED", error: "Enriched within last 7 days" },
      });
      return { skipped: "recently enriched" };
    }

    // Run enrichment
    const strategy = new AgentEnrichmentStrategy(openaiApiKey!, firecrawlApiKey!);
    const result = await strategy.enrichRow(
      { email: contact.email },
      fields,
      "email"
    );

    const stored: StoredEnrichmentResult = {
      enrichments: result.enrichments,
      status: result.status as "completed" | "error" | "skipped",
      error: result.error,
    };

    // Apply only to empty fields
    const updates: Record<string, string> = {};
    for (const [fieldName, enrichment] of Object.entries(result.enrichments)) {
      const contactColumn = contactFieldMap[fieldName as keyof typeof contactFieldMap];
      if (!contactColumn) continue;
      const currentValue = contact[contactColumn] as string | null;
      if (isFieldEmpty(currentValue) && enrichment.value) {
        updates[contactColumn] = String(enrichment.value);
      }
    }

    if (Object.keys(updates).length > 0) {
      await prismadb.crm_Contacts.update({
        where: { id: contactId },
        data: updates,
      });
    }

    await prismadb.crm_Contact_Enrichment.update({
      where: { id: enrichmentId },
      data: { status: "COMPLETED", result: stored as any },
    });

    return { enriched: true, fieldsApplied: Object.keys(updates) };
  }
);
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm jest tests/enrichment/enrich-contact-job.test.ts --no-coverage
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add inngest/functions/enrich-contact.ts tests/enrichment/enrich-contact-job.test.ts
git commit -m "feat: add enrich-contact Inngest function with dedup logic"
```

---

## Task 7: Inngest fan-out function + bulk API route

**Files:**
- Create: `inngest/functions/enrich-contacts-bulk.ts`
- Create: `app/api/crm/contacts/enrich-bulk/route.ts`

- [ ] **Step 1: Create fan-out Inngest function**

Create `inngest/functions/enrich-contacts-bulk.ts`:

```typescript
import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import type { EnrichmentField } from "@/lib/enrichment/types";

export const enrichContactsBulk = inngest.createFunction(
  {
    id: "enrich-contacts-bulk",
    name: "Enrich Contacts Bulk",
    triggers: [{ event: "enrich/contacts.bulk" }],
  },
  async ({ event, step }) => {
    const { contactIds, fields, triggeredBy } = event.data as {
      contactIds: string[];
      fields: EnrichmentField[];
      triggeredBy?: string;
    };

    // Create one enrichment record per contact
    const records = await step.run("create-enrichment-records", async () => {
      const created = await Promise.all(
        contactIds.map((contactId) =>
          prismadb.crm_Contact_Enrichment.create({
            data: {
              contactId,
              status: "PENDING",
              fields: fields.map((f) => f.name),
              triggeredBy: triggeredBy ?? null,
            },
            select: { id: true, contactId: true },
          })
        )
      );
      return created;
    });

    // Fan out: one event per contact
    await step.sendEvent(
      "fan-out-enrichments",
      records.map((r) => ({
        name: "enrich/contact.run",
        data: { contactId: r.contactId, enrichmentId: r.id, fields },
      }))
    );

    return { dispatched: records.length };
  }
);
```

- [ ] **Step 2: Create bulk API route**

Create `app/api/crm/contacts/enrich-bulk/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { inngest } from "@/inngest/client";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { contactIds, fields } = await request.json();

  if (!Array.isArray(contactIds) || contactIds.length === 0) {
    return NextResponse.json({ error: "contactIds must be a non-empty array" }, { status: 400 });
  }
  if (contactIds.length > 100) {
    return NextResponse.json({ error: "Maximum 100 contacts per batch" }, { status: 400 });
  }
  if (!Array.isArray(fields) || fields.length === 0) {
    return NextResponse.json({ error: "fields must be a non-empty array" }, { status: 400 });
  }

  await inngest.send({
    name: "enrich/contacts.bulk",
    data: { contactIds, fields, triggeredBy: session.user.id },
  });

  return NextResponse.json({ success: true, count: contactIds.length });
}
```

- [ ] **Step 3: Register both new functions in Inngest route**

Open `app/api/inngest/route.ts`. It currently imports and registers 9 functions. Make two additions:

**At the top, after the existing imports, add:**
```typescript
import { enrichContact } from "@/inngest/functions/enrich-contact";
import { enrichContactsBulk } from "@/inngest/functions/enrich-contacts-bulk";
```

**Inside the `functions: [...]` array, append:**
```typescript
    enrichContact,
    enrichContactsBulk,
```

The final `functions` array must include all existing entries PLUS these two new ones. Verify with:

```bash
npx tsc --noEmit 2>&1 | grep "inngest/route" | head -5
```

Expected: no errors. If you see "enrichContact is not exported" — check the function name matches exactly in `inngest/functions/enrich-contact.ts`.

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -E "enrich|inngest" | head -20
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add inngest/functions/enrich-contacts-bulk.ts app/api/crm/contacts/enrich-bulk/route.ts app/api/inngest/route.ts
git commit -m "feat: add bulk enrichment fan-out and register Inngest functions"
```

---

## Task 8: EnrichFieldSelector shared component

**Files:**
- Create: `app/[locale]/(routes)/crm/contacts/components/EnrichFieldSelector.tsx`

This component is used by both the single-contact drawer and the bulk modal.

- [ ] **Step 1: Create the component**

Create `app/[locale]/(routes)/crm/contacts/components/EnrichFieldSelector.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import type { EnrichmentField } from "@/lib/enrichment/types";

// Fields with direct crm_Contacts column mappings — results can be auto-saved.
// company_name, industry, tech_stack, funding_stage have no dedicated column;
// add them as custom fields if you want to see the enriched data in the diff preview.
const PRESET_FIELDS: EnrichmentField[] = [
  { name: "position",         displayName: "Position / Job Title",  description: "The contact's job title or role at their company", type: "string", required: false },
  { name: "website",          displayName: "Company Website",        description: "The company's official website URL", type: "string", required: false },
  { name: "social_linkedin",  displayName: "LinkedIn URL",           description: "The contact's or company's LinkedIn profile URL", type: "string", required: false },
  { name: "social_twitter",   displayName: "Twitter / X URL",        description: "The contact's or company's Twitter/X profile URL", type: "string", required: false },
  { name: "social_facebook",  displayName: "Facebook URL",           description: "The contact's or company's Facebook page URL", type: "string", required: false },
  { name: "social_instagram", displayName: "Instagram URL",          description: "The contact's or company's Instagram profile URL", type: "string", required: false },
  { name: "description",      displayName: "Company Description",    description: "A brief description of what the company does", type: "string", required: false },
  { name: "office_phone",     displayName: "Office Phone",           description: "The company or contact's office phone number", type: "string", required: false },
  { name: "mobile_phone",     displayName: "Mobile Phone",           description: "The contact's mobile phone number", type: "string", required: false },
];

interface EnrichFieldSelectorProps {
  onStart: (fields: EnrichmentField[]) => void;
  loading?: boolean;
}

export function EnrichFieldSelector({ onStart, loading }: EnrichFieldSelectorProps) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(["company_name", "industry", "position", "social_linkedin"])
  );
  const [customFields, setCustomFields] = useState<EnrichmentField[]>([]);
  const [customName, setCustomName] = useState("");
  const [customDesc, setCustomDesc] = useState("");

  const toggle = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const addCustom = () => {
    if (!customName.trim()) return;
    const field: EnrichmentField = {
      name: customName.toLowerCase().replace(/\s+/g, "_"),
      displayName: customName.trim(),
      description: customDesc.trim() || `Find the ${customName.trim()} for this contact`,
      type: "string",
      required: false,
    };
    setCustomFields((prev) => [...prev, field]);
    setSelected((prev) => new Set([...prev, field.name]));
    setCustomName("");
    setCustomDesc("");
  };

  const removeCustom = (name: string) => {
    setCustomFields((prev) => prev.filter((f) => f.name !== name));
    setSelected((prev) => { const next = new Set(prev); next.delete(name); return next; });
  };

  const allFields = [...PRESET_FIELDS, ...customFields];
  const selectedFields = allFields.filter((f) => selected.has(f.name));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Select the data points to enrich. Firecrawl will search the web to find them.
      </p>

      <div className="space-y-2">
        {PRESET_FIELDS.map((field) => (
          <div key={field.name} className="flex items-center gap-2">
            <Checkbox
              id={field.name}
              checked={selected.has(field.name)}
              onCheckedChange={() => toggle(field.name)}
            />
            <Label htmlFor={field.name} className="cursor-pointer font-normal">
              {field.displayName}
            </Label>
          </div>
        ))}

        {customFields.map((field) => (
          <div key={field.name} className="flex items-center gap-2">
            <Checkbox
              id={field.name}
              checked={selected.has(field.name)}
              onCheckedChange={() => toggle(field.name)}
            />
            <Label htmlFor={field.name} className="cursor-pointer font-normal flex-1">
              {field.displayName}
            </Label>
            <Button variant="ghost" size="sm" onClick={() => removeCustom(field.name)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      <div className="border rounded-md p-3 space-y-2 bg-muted/30">
        <p className="text-xs font-medium text-muted-foreground">Add custom field</p>
        <Input
          placeholder="Field name (e.g. Number of employees)"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          className="h-8 text-sm"
        />
        <Input
          placeholder="Description (optional)"
          value={customDesc}
          onChange={(e) => setCustomDesc(e.target.value)}
          className="h-8 text-sm"
        />
        <Button variant="outline" size="sm" onClick={addCustom} disabled={!customName.trim()}>
          <Plus className="h-3 w-3 mr-1" /> Add field
        </Button>
      </div>

      <Button
        className="w-full"
        disabled={selectedFields.length === 0 || loading}
        onClick={() => onStart(selectedFields)}
      >
        {loading ? "Starting…" : `Start Enrichment (${selectedFields.length} fields)`}
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep "EnrichFieldSelector" | head -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/(routes)/crm/contacts/components/EnrichFieldSelector.tsx"
git commit -m "feat: add EnrichFieldSelector shared component"
```

---

## Task 9: EnrichContactDrawer component

**Files:**
- Create: `app/[locale]/(routes)/crm/contacts/[contactId]/components/EnrichContactDrawer.tsx`

Three-step drawer: field selection → progress → diff preview.

- [ ] **Step 1: Create the drawer**

Create `app/[locale]/(routes)/crm/contacts/[contactId]/components/EnrichContactDrawer.tsx`:

```tsx
"use client";

import { useState, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, CheckCircle, XCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { EnrichFieldSelector } from "../../components/EnrichFieldSelector";
import type { EnrichmentField } from "@/lib/enrichment/types";
import type { StoredEnrichmentResult } from "@/lib/enrichment/types/stored-result";

type Step = "select" | "progress" | "diff";

interface AgentMessage {
  message: string;
  type: string;
  sourceUrl?: string;
}

interface ContactCurrentData {
  position?: string | null;
  website?: string | null;
  social_linkedin?: string | null;
  social_twitter?: string | null;
  social_facebook?: string | null;
  social_instagram?: string | null;
  description?: string | null;
  office_phone?: string | null;
  mobile_phone?: string | null;
}

interface EnrichContactDrawerProps {
  contactId: string;
  contactEmail: string | null;
  contactCurrentData: ContactCurrentData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplied: () => void;
}

export function EnrichContactDrawer({
  contactId,
  contactEmail,
  contactCurrentData,
  open,
  onOpenChange,
  onApplied,
}: EnrichContactDrawerProps) {
  const [step, setStep] = useState<Step>("select");
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [result, setResult] = useState<StoredEnrichmentResult | null>(null);
  const [enrichmentId, setEnrichmentId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [selectedApply, setSelectedApply] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const reset = () => {
    setStep("select");
    setMessages([]);
    setResult(null);
    setEnrichmentId(null);
    setSessionId(null);
    setSelectedApply(new Set());
  };

  const handleClose = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  const handleStart = async (fields: EnrichmentField[]) => {
    setStep("progress");
    setMessages([]);

    const response = await fetch("/api/crm/contacts/enrich", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId, fields }),
    });

    if (!response.ok) {
      const err = await response.json();
      toast.error(err.error ?? "Failed to start enrichment");
      setStep("select");
      return;
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      for (const line of chunk.split("\n")) {
        if (!line.startsWith("data: ")) continue;
        const event = JSON.parse(line.slice(6));

        if (event.type === "session") {
          setSessionId(event.sessionId);
        } else if (event.type === "agent_progress") {
          setMessages((prev) => [...prev, { message: event.message, type: event.messageType, sourceUrl: event.sourceUrl }]);
          setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
        } else if (event.type === "result") {
          setResult(event.result);
          setEnrichmentId(event.enrichmentId);
          const allKeys = new Set(Object.keys(event.result.enrichments));
          setSelectedApply(allKeys);
        } else if (event.type === "complete") {
          setStep("diff");
        } else if (event.type === "error") {
          toast.error(event.error);
          setStep("select");
        }
      }
    }
  };

  const handleCancel = async () => {
    if (sessionId) {
      await fetch(`/api/crm/contacts/enrich?sessionId=${sessionId}`, { method: "DELETE" });
    }
    reset();
  };

  const handleApply = async () => {
    if (!result || !enrichmentId) return;
    setApplying(true);

    const updates: Record<string, string> = {};
    for (const [fieldName, enrichment] of Object.entries(result.enrichments)) {
      if (selectedApply.has(fieldName) && enrichment.value) {
        updates[fieldName] = String(enrichment.value);
      }
    }

    const res = await fetch(`/api/crm/contacts/${contactId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enrichmentFields: updates }),
    });

    if (res.ok) {
      toast.success("Contact enriched successfully");
      onApplied();
      handleClose(false);
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Failed to apply enrichment");
    }
    setApplying(false);
  };

  const noEmail = !contactEmail;

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-[420px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-orange-500" />
            Enrich with AI
          </SheetTitle>
          <SheetDescription>
            {noEmail
              ? "Add an email to this contact to enable enrichment."
              : "Firecrawl searches the web to fill in missing contact details."}
          </SheetDescription>
        </SheetHeader>

        {noEmail && (
          <div className="mt-4 text-sm text-muted-foreground">
            No email address found on this contact.
          </div>
        )}

        {!noEmail && step === "select" && (
          <div className="mt-4">
            <EnrichFieldSelector onStart={handleStart} />
          </div>
        )}

        {step === "progress" && (
          <div className="mt-4 space-y-3">
            <ScrollArea className="h-[400px] pr-4">
              {messages.map((m, i) => (
                <div key={i} className="flex gap-2 text-sm py-1">
                  <span className="text-muted-foreground shrink-0">
                    {m.type === "success" ? "✓" : m.type === "agent" ? "🤖" : "›"}
                  </span>
                  <span className={m.type === "agent" ? "font-medium" : ""}>
                    {m.message}
                    {m.sourceUrl && (
                      <a href={m.sourceUrl} target="_blank" rel="noopener noreferrer"
                        className="ml-1 text-blue-500 inline-flex items-center gap-0.5">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </span>
                </div>
              ))}
              <div ref={scrollRef} />
            </ScrollArea>
            <Button variant="outline" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        )}

        {step === "diff" && result && (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Review enriched data. Uncheck any fields you don't want to apply.
            </p>
            <ScrollArea className="h-[380px]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground text-xs">
                    <th className="text-left pb-2 w-6"></th>
                    <th className="text-left pb-2">Field</th>
                    <th className="text-left pb-2 text-muted-foreground">Current</th>
                    <th className="text-left pb-2">Enriched</th>
                  </tr>
                </thead>
                <tbody className="space-y-1">
                  {Object.entries(result.enrichments).map(([fieldName, enrichment]) => {
                    const currentValue = (contactCurrentData as Record<string, string | null | undefined>)[fieldName];
                    return (
                      <tr key={fieldName} className="border-t">
                        <td className="py-2">
                          <Checkbox
                            checked={selectedApply.has(fieldName)}
                            onCheckedChange={(checked) => {
                              setSelectedApply((prev) => {
                                const next = new Set(prev);
                                checked ? next.add(fieldName) : next.delete(fieldName);
                                return next;
                              });
                            }}
                          />
                        </td>
                        <td className="py-2 pr-2 font-medium capitalize whitespace-nowrap">
                          {fieldName.replace(/_/g, " ")}
                          <div className="text-xs text-muted-foreground font-normal">
                            {Math.round(enrichment.confidence * 100)}% confident
                          </div>
                        </td>
                        <td className="py-2 pr-2 text-muted-foreground max-w-[100px] truncate">
                          {currentValue ?? <span className="italic text-xs">empty</span>}
                        </td>
                        <td className="py-2">
                          <div className="font-medium">{String(enrichment.value)}</div>
                          {enrichment.source && (
                            <a href={enrichment.source} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-blue-500 inline-flex items-center gap-0.5 mt-0.5">
                              <ExternalLink className="h-3 w-3" />
                              Source
                            </a>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ScrollArea>

            <div className="flex gap-2">
              <Button
                className="flex-1"
                disabled={selectedApply.size === 0 || applying}
                onClick={handleApply}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                {applying ? "Applying…" : `Apply ${selectedApply.size} fields`}
              </Button>
              <Button variant="outline" onClick={() => handleClose(false)}>
                <XCircle className="h-4 w-4 mr-1" />
                Discard
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: Add PATCH /api/crm/contacts/[id] route for applying enrichment**

Check if `app/api/crm/contacts/[id]/route.ts` exists:

```bash
ls app/api/crm/contacts/
```

If no `[id]` route exists, create `app/api/crm/contacts/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prismadb } from "@/lib/prisma";

// Maps enrichment field names to crm_Contacts columns.
// Only fields with a 1:1 column mapping are included — enrichment results for
// unmapped fields (company_name, industry, tech_stack, funding_stage) are shown
// in the diff preview but cannot be auto-saved to a dedicated column.
const FIELD_MAP: Record<string, string> = {
  position:        "position",
  website:         "website",
  social_linkedin: "social_linkedin",
  social_twitter:  "social_twitter",
  social_facebook: "social_facebook",
  social_instagram:"social_instagram",
  description:     "description",
  office_phone:    "office_phone",
  mobile_phone:    "mobile_phone",
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { enrichmentFields } = await request.json();
  if (!enrichmentFields || typeof enrichmentFields !== "object") {
    return NextResponse.json({ error: "enrichmentFields required" }, { status: 400 });
  }

  const updates: Record<string, string> = {};
  for (const [key, value] of Object.entries(enrichmentFields)) {
    const column = FIELD_MAP[key];
    if (column) updates[column] = String(value);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const contact = await prismadb.crm_Contacts.update({
    where: { id: params.id },
    data: { ...updates, updatedBy: session.user.id },
    select: { id: true },
  });

  return NextResponse.json({ success: true, id: contact.id });
}
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -E "EnrichContactDrawer|contacts/\[id\]" | head -10
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "app/[locale]/(routes)/crm/contacts/[contactId]/components/EnrichContactDrawer.tsx" \
  "app/api/crm/contacts/[id]/route.ts"
git commit -m "feat: add EnrichContactDrawer with SSE progress and diff preview"
```

---

## Task 10: Wire EnrichContactDrawer into contact detail page

**Files:**
- Modify: `app/[locale]/(routes)/crm/contacts/[contactId]/components/BasicView.tsx`

- [ ] **Step 1: Read the current BasicView**

```bash
cat "app/[locale]/(routes)/crm/contacts/[contactId]/components/BasicView.tsx" | head -30
```

Note what props `BasicView` receives (it takes `data: any`).

- [ ] **Step 2: Add Enrich button + drawer**

At the top of `BasicView.tsx`, add:

```typescript
"use client"; // May need to convert to client component, or extract a wrapper

import { useState } from "react";
import { EnrichContactDrawer } from "./EnrichContactDrawer";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
```

Inside the component's JSX, add the button alongside the existing action area (typically near the top of the first Card's `CardHeader`):

```tsx
{/* Add this block where the contact name/actions are shown */}
const [enrichOpen, setEnrichOpen] = useState(false);

// In JSX, near the top action buttons:
<Button
  variant="outline"
  size="sm"
  onClick={() => setEnrichOpen(true)}
  disabled={!data.email}
  title={!data.email ? "Add an email to enable enrichment" : "Enrich with AI"}
>
  <Sparkles className="h-4 w-4 mr-1 text-orange-500" />
  Enrich with AI
</Button>

<EnrichContactDrawer
  contactId={data.id}
  contactEmail={data.email}
  contactCurrentData={{
    position:         data.position,
    website:          data.website,
    social_linkedin:  data.social_linkedin,
    social_twitter:   data.social_twitter,
    social_facebook:  data.social_facebook,
    social_instagram: data.social_instagram,
    description:      data.description,
    office_phone:     data.office_phone,
    mobile_phone:     data.mobile_phone,
  }}
  open={enrichOpen}
  onOpenChange={setEnrichOpen}
  onApplied={() => window.location.reload()}
/>
```

> **Note:** If `BasicView` is currently a Server Component (no `"use client"`), convert it to a Client Component by adding `"use client"` at the top. The data is passed as a prop so this is safe.

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep "BasicView" | head -10
```

Expected: no errors.

- [ ] **Step 4: Manual smoke test**

1. Start dev server: `pnpm dev`
2. Navigate to a contact that has an email address
3. Verify "Enrich with AI" button appears
4. Click it — drawer should open at Step 1 (field selection)
5. For a contact without email: button should be disabled

- [ ] **Step 5: Commit**

```bash
git add "app/[locale]/(routes)/crm/contacts/[contactId]/components/BasicView.tsx"
git commit -m "feat: add Enrich with AI button to contact detail page"
```

---

## Task 11: Contacts list bulk selection + BulkEnrichModal

**Files:**
- Modify: `app/[locale]/(routes)/crm/contacts/table-components/columns.tsx`
- Modify: `app/[locale]/(routes)/crm/contacts/table-components/data-table-toolbar.tsx`
- Create: `app/[locale]/(routes)/crm/contacts/components/BulkEnrichModal.tsx`

- [ ] **Step 1: Add checkbox selection column to contacts table**

In `columns.tsx`, add a selection column as the first column:

```typescript
// Add this import at the top:
import { Checkbox } from "@/components/ui/checkbox";

// Add this as the FIRST entry in the columns array:
{
  id: "select",
  header: ({ table }) => (
    <Checkbox
      checked={table.getIsAllPageRowsSelected()}
      onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
      aria-label="Select all"
    />
  ),
  cell: ({ row }) => (
    <Checkbox
      checked={row.getIsSelected()}
      onCheckedChange={(value) => row.toggleSelected(!!value)}
      aria-label="Select row"
    />
  ),
  enableSorting: false,
  enableHiding: false,
},
```

Also ensure the DataTable component has `enableRowSelection` enabled. Check `data-table.tsx` for the `useReactTable` call and add `enableRowSelection: true` if not present.

- [ ] **Step 2: Create BulkEnrichModal**

Create `app/[locale]/(routes)/crm/contacts/components/BulkEnrichModal.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { EnrichFieldSelector } from "./EnrichFieldSelector";
import type { EnrichmentField } from "@/lib/enrichment/types";

interface BulkEnrichModalProps {
  contactIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BulkEnrichModal({ contactIds, open, onOpenChange }: BulkEnrichModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleStart = async (fields: EnrichmentField[]) => {
    setLoading(true);
    try {
      const res = await fetch("/api/crm/contacts/enrich-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactIds, fields }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "Failed to start bulk enrichment");
        return;
      }

      toast.success(`Enriching ${contactIds.length} contacts in the background`);
      onOpenChange(false);
      router.push("/crm/contacts/enrichment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Enrich {contactIds.length} Contacts</DialogTitle>
          <DialogDescription>
            Select fields to enrich. Jobs run in the background — only empty fields will be updated.
          </DialogDescription>
        </DialogHeader>
        <EnrichFieldSelector onStart={handleStart} loading={loading} />
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Add bulk enrich button to toolbar**

Modify `data-table-toolbar.tsx` to show a bulk enrich button when rows are selected:

```tsx
// Add to imports:
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { BulkEnrichModal } from "../components/BulkEnrichModal";

// Add inside DataTableToolbar component:
const [bulkEnrichOpen, setBulkEnrichOpen] = useState(false);
const selectedRows = table.getFilteredSelectedRowModel().rows;
const selectedIds = selectedRows.map((r) => (r.original as any).id as string);

// Add to JSX (after the filter input, before ViewOptions):
{selectedRows.length > 0 && (
  <>
    <Button
      variant="outline"
      size="sm"
      className="h-8"
      onClick={() => setBulkEnrichOpen(true)}
    >
      <Sparkles className="h-3 w-3 mr-1 text-orange-500" />
      Enrich {selectedRows.length} contacts
    </Button>
    <BulkEnrichModal
      contactIds={selectedIds}
      open={bulkEnrichOpen}
      onOpenChange={setBulkEnrichOpen}
    />
  </>
)}
```

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -E "BulkEnrich|columns|toolbar" | head -10
```

Expected: no errors.

- [ ] **Step 5: Manual smoke test**

1. Navigate to contacts list
2. Verify checkbox column appears
3. Select 2-3 contacts → "Enrich X contacts" button appears in toolbar
4. Click → modal opens with field selector

- [ ] **Step 6: Commit**

```bash
git add "app/[locale]/(routes)/crm/contacts/table-components/columns.tsx" \
  "app/[locale]/(routes)/crm/contacts/table-components/data-table-toolbar.tsx" \
  "app/[locale]/(routes)/crm/contacts/components/BulkEnrichModal.tsx"
git commit -m "feat: add bulk contact selection and BulkEnrichModal"
```

---

## Task 12: Enrichment Jobs page

**Files:**
- Create: `app/[locale]/(routes)/crm/contacts/enrichment/RetryButton.tsx`
- Create: `app/[locale]/(routes)/crm/contacts/enrichment/page.tsx`

- [ ] **Step 1: Create RetryButton client component**

Create `app/[locale]/(routes)/crm/contacts/enrichment/RetryButton.tsx`:

```tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

interface RetryButtonProps {
  contactId: string;
}

// Links to the contact page where the user can re-run enrichment manually.
// Full retry automation (re-send Inngest event) can be a future enhancement.
export function RetryButton({ contactId }: RetryButtonProps) {
  return (
    <Link href={`/crm/contacts/${contactId}`}>
      <Button variant="ghost" size="sm">View &amp; Retry</Button>
    </Link>
  );
}
```

- [ ] **Step 2: Create the page**

Create `app/[locale]/(routes)/crm/contacts/enrichment/page.tsx`:

```tsx
import { prismadb } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import Container from "../../components/ui/Container";
import { RetryButton } from "./RetryButton";

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PENDING:   { label: "Pending",   variant: "secondary" },
  RUNNING:   { label: "Running",   variant: "default" },
  COMPLETED: { label: "Completed", variant: "outline" },
  FAILED:    { label: "Failed",    variant: "destructive" },
  SKIPPED:   { label: "Skipped",   variant: "secondary" },
};

export default async function EnrichmentJobsPage() {
  const jobs = await prismadb.crm_Contact_Enrichment.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      contact: { select: { id: true, first_name: true, last_name: true } },
      triggered_by_user: { select: { name: true } },
    },
  });

  return (
    <Container title="Enrichment Jobs" description="Background contact enrichment status">
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">Contact</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Fields</th>
              <th className="text-left p-3 font-medium">Started</th>
              <th className="text-left p-3 font-medium">By</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => {
              const badge = STATUS_BADGE[job.status] ?? STATUS_BADGE.PENDING;
              return (
                <tr key={job.id} className="border-b last:border-0">
                  <td className="p-3">
                    <Link
                      href={`/crm/contacts/${job.contactId}`}
                      className="hover:underline font-medium"
                    >
                      {job.contact.first_name} {job.contact.last_name}
                    </Link>
                  </td>
                  <td className="p-3">
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                    {job.error && (
                      <div className="text-xs text-muted-foreground mt-0.5 max-w-[200px] truncate" title={job.error}>
                        {job.error}
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {job.fields.join(", ")}
                  </td>
                  <td className="p-3 text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(job.createdAt, { addSuffix: true })}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {job.triggered_by_user?.name ?? "—"}
                  </td>
                  <td className="p-3">
                    {job.status === "FAILED" && (
                      <RetryButton contactId={job.contactId} />
                    )}
                  </td>
                </tr>
              );
            })}
            {jobs.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  No enrichment jobs yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Container>
  );
}

// RetryButton is defined in RetryButton.tsx (separate "use client" file)
```

> **Note:** The retry action is simplified — just a "View" link to re-run enrichment manually from the contact detail page. A proper retry button can be a follow-up enhancement.

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep "enrichment/page" | head -10
```

Expected: no errors.

- [ ] **Step 3: Verify page renders**

1. Navigate to `/crm/contacts/enrichment`
2. Should render table (empty or with jobs)

- [ ] **Step 4: Commit**

```bash
git add "app/[locale]/(routes)/crm/contacts/enrichment/page.tsx" \
  "app/[locale]/(routes)/crm/contacts/enrichment/RetryButton.tsx"
git commit -m "feat: add enrichment jobs status page"
```

---

## Task 13: End-to-end smoke test + cleanup

- [ ] **Step 1: Run full test suite**

```bash
pnpm jest --no-coverage
```

Expected: all tests pass including the 9 new tests in `tests/enrichment/`.

- [ ] **Step 2: TypeScript full check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Smoke test full flow**

With `FIRECRAWL_API_KEY` and `OPENAI_API_KEY` set in `.env.local`:

1. Open a contact with a work email (e.g. someone@company.com)
2. Click "Enrich with AI"
3. Select Industry + LinkedIn + Position
4. Click "Start Enrichment" — verify agent progress messages stream in
5. Verify diff preview appears with enriched values and source links
6. Select all fields → "Apply 3 fields" → contact is updated
7. Navigate to contacts list → select 3 contacts → "Enrich 3 contacts" → modal opens → Start
8. Navigate to `/crm/contacts/enrichment` → verify 3 PENDING/RUNNING/COMPLETED rows appear

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: contact enrichment via Firecrawl — complete implementation

- Copy fire-enrich lib into lib/enrichment/
- Add crm_Contact_Enrichment model + Prisma migration
- SSE streaming route for single-contact enrichment
- Inngest fan-out + per-contact job for bulk enrichment
- EnrichContactDrawer with field selection, live progress, diff preview
- Bulk selection + BulkEnrichModal in contacts list
- Enrichment Jobs status page"
```
