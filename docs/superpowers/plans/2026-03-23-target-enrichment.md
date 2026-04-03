# Target Enrichment via Firecrawl — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let NextCRM users enrich `crm_Targets` records with company data, position, websites, phones, and social URLs using the fire-enrich multi-agent engine — both one-at-a-time with a live progress drawer, and in bulk via Inngest background jobs.

**Architecture:** Identical to `feature/contact-enrichment`. The existing `lib/enrichment/` library is reused unchanged. A streaming SSE route handles single-target enrichment with real-time agent progress; a separate bulk route fans out to Inngest jobs. The drawer shows a diff preview before saving; bulk auto-applies to empty fields only.

**Tech Stack:** Next.js App Router, Prisma + PostgreSQL, Inngest, `@mendable/firecrawl-js` (already installed), OpenAI (already present), Tailwind + shadcn/ui, TanStack Table.

**Spec:** `docs/superpowers/specs/2026-03-23-target-enrichment-design.md`

**Critical notes:**
- Auth import: `import { authOptions } from "@/lib/auth"` (NOT `@/lib/authOptions`)
- Tests go in `__tests__/enrichment/` (jest testMatch only covers `**/__tests__/**/*.test.ts`)
- Next.js 16: route params must be `Promise<{id: string}>` — always `await params`
- `columns.tsx` uses `export const columns: ColumnDef<Target>[]` (plain array, NOT `createColumns()`)
- `crm_Enrichment_Status` enum already exists — do NOT redefine it
- Prisma: use `prisma db push` (not `migrate dev`) — live DB has drift from migration history
- Inngest registration note: Task 3 Step 3 registers both new functions in `app/api/inngest/route.ts`

---

## File Map

**New files:**
- `app/api/crm/targets/enrich/validate.ts` — pure validation logic (testable)
- `app/api/crm/targets/enrich/route.ts` — SSE stream + cancel endpoint
- `app/api/crm/targets/enrich-bulk/route.ts` — bulk trigger
- `app/api/crm/targets/[id]/route.ts` — PATCH apply enrichment fields
- `inngest/functions/enrich-target.ts` — per-target job with 7-day dedup
- `inngest/functions/enrich-targets-bulk.ts` — fan-out orchestrator
- `app/[locale]/(routes)/crm/targets/[targetId]/components/EnrichButton.tsx` — client button+drawer wrapper
- `app/[locale]/(routes)/crm/targets/[targetId]/components/EnrichTargetDrawer.tsx` — SSE drawer
- `app/[locale]/(routes)/crm/targets/components/BulkEnrichTargetsModal.tsx` — bulk modal
- `app/[locale]/(routes)/crm/targets/enrichment/page.tsx` — jobs status page
- `app/[locale]/(routes)/crm/targets/enrichment/RetryEnrichmentButton.tsx` — retry button
- `__tests__/enrichment/enrich-target-route.test.ts` — validate tests
- `__tests__/enrichment/enrich-target-job.test.ts` — dedup logic tests

**Modified files:**
- `prisma/schema.prisma` — add `crm_Target_Enrichment` model + back-relations
- `app/api/inngest/route.ts` — register `enrichTarget` + `enrichTargetsBulk`
- `app/[locale]/(routes)/crm/targets/[targetId]/components/BasicView.tsx` — add EnrichButton
- `app/[locale]/(routes)/crm/targets/table-components/columns.tsx` — add checkbox column
- `app/[locale]/(routes)/crm/targets/table-components/data-table.tsx` — add bulk toolbar

---

## Task 1: Prisma schema — add crm_Target_Enrichment

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add the new model**

In `prisma/schema.prisma`, add this model after `crm_Contact_Enrichment`:

```prisma
model crm_Target_Enrichment {
  id          String                  @id @default(uuid()) @db.Uuid
  targetId    String                  @db.Uuid
  status      crm_Enrichment_Status   @default(PENDING)
  fields      String[]
  result      Json?
  error       String?
  triggeredBy String?                 @db.Uuid
  createdAt   DateTime                @default(now())
  updatedAt   DateTime                @updatedAt

  target            crm_Targets       @relation(fields: [targetId], references: [id])
  triggered_by_user Users?            @relation("target_enrichment_triggered_by", fields: [triggeredBy], references: [id])

  @@index([targetId])
  @@index([status])
  @@index([createdAt])
  @@index([triggeredBy])
}
```

Do NOT add a new `crm_Enrichment_Status` enum — it already exists.

- [ ] **Step 2: Add back-relations**

In the `crm_Targets` model block, add:
```prisma
enrichments   crm_Target_Enrichment[]
```

In the `Users` model block, add (use this exact relation name to avoid conflict with the existing `"enrichment_triggered_by"` relation):
```prisma
target_enrichments_triggered  crm_Target_Enrichment[]  @relation("target_enrichment_triggered_by")
```

- [ ] **Step 3: Push schema to DB**

```bash
pnpm prisma db push
```

Expected: schema applied, Prisma client regenerated. Verify with:
```bash
npx tsc --noEmit 2>&1 | grep "crm_Target_Enrichment" | head -5
```
Expected: no errors — `prismadb.crm_Target_Enrichment` now available.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add crm_Target_Enrichment model to schema"
```

---

## Task 2: SSE API route + validate + PATCH route

**Files:**
- Create: `app/api/crm/targets/enrich/validate.ts`
- Create: `__tests__/enrichment/enrich-target-route.test.ts`
- Create: `app/api/crm/targets/enrich/route.ts`
- Create: `app/api/crm/targets/[id]/route.ts`

- [ ] **Step 1: Write failing validation tests**

Create `__tests__/enrichment/enrich-target-route.test.ts`:

```typescript
import { validateEnrichRequest } from "@/app/api/crm/targets/enrich/validate";

describe("validateEnrichRequest (targets)", () => {
  it("returns error when targetId missing", () => {
    const result = validateEnrichRequest({ contactId: "", fields: [{ name: "position" }] });
    expect(result).toBe("contactId and fields are required");
  });
  it("returns error when fields is empty array", () => {
    const result = validateEnrichRequest({ contactId: "abc", fields: [] });
    expect(result).toBe("contactId and fields are required");
  });
  it("returns null when valid", () => {
    const result = validateEnrichRequest({ contactId: "abc", fields: [{ name: "position" }] });
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify they fail**

```bash
pnpm jest __tests__/enrichment/enrich-target-route.test.ts --no-coverage 2>&1 | tail -10
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create validate.ts**

Create `app/api/crm/targets/enrich/validate.ts`:

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
pnpm jest __tests__/enrichment/enrich-target-route.test.ts --no-coverage 2>&1 | tail -10
```

Expected: PASS (3 tests).

- [ ] **Step 5: Create SSE route**

Create `app/api/crm/targets/enrich/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { AgentEnrichmentStrategy } from "@/lib/enrichment/strategies/agent-enrichment-strategy";
import type { EnrichmentField } from "@/lib/enrichment/types";
import type { StoredEnrichmentResult } from "@/lib/enrichment/types/stored-result";
import { validateEnrichRequest } from "./validate";

export const runtime = "nodejs";

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
      { error: "Enrichment not configured. Set FIRECRAWL_API_KEY and OPENAI_API_KEY." },
      { status: 503 }
    );
  }

  const body = await request.json();
  const validationError = validateEnrichRequest(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }
  const { contactId: targetId, fields } = body as { contactId: string; fields: EnrichmentField[] };

  const target = await prismadb.crm_Targets.findUnique({
    where: { id: targetId },
    select: { id: true, email: true },
  });

  if (!target) {
    return NextResponse.json({ error: "Target not found" }, { status: 404 });
  }
  if (!target.email) {
    return NextResponse.json(
      { error: "Target has no email. Add an email to enable enrichment." },
      { status: 422 }
    );
  }

  const enrichmentRecord = await prismadb.crm_Target_Enrichment.create({
    data: {
      targetId,
      status: "RUNNING",
      fields: fields.map((f) => f.name),
      triggeredBy: session.user.id,
    },
  });

  const sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const abortController = new AbortController();
  activeSessions.set(sessionId, { controller: abortController, enrichmentId: enrichmentRecord.id });

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
          { email: target.email! },
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

        await prismadb.crm_Target_Enrichment.update({
          where: { id: enrichmentRecord.id },
          data: { status: "COMPLETED", result: stored as object },
        });

        enqueue({ type: "result", result: stored, enrichmentId: enrichmentRecord.id });
        enqueue({ type: "complete" });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        await prismadb.crm_Target_Enrichment.update({
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

  await prismadb.crm_Target_Enrichment.update({
    where: { id: entry.enrichmentId },
    data: { status: "FAILED", error: "Cancelled by user" },
  }).catch(() => {});

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 6: Create PATCH route**

Create `app/api/crm/targets/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";

const FIELD_MAP: Record<string, string> = {
  position:         "position",
  company:          "company",
  company_website:  "company_website",
  personal_website: "personal_website",
  mobile_phone:     "mobile_phone",
  office_phone:     "office_phone",
  social_linkedin:  "social_linkedin",
  social_x:         "social_x",
  social_instagram: "social_instagram",
  social_facebook:  "social_facebook",
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  const target = await prismadb.crm_Targets.update({
    where: { id },
    data: updates,
    select: { id: true },
  });

  return NextResponse.json({ success: true, id: target.id });
}
```

- [ ] **Step 7: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -E "targets/enrich|targets/\[id\]" | head -10
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add "app/api/crm/targets/enrich/" "app/api/crm/targets/[id]/" "__tests__/enrichment/enrich-target-route.test.ts"
git commit -m "feat: add target SSE enrichment route, PATCH route, and validation tests"
```

---

## Task 3: enrich-target Inngest job + fan-out + bulk API + registration

**Files:**
- Create: `__tests__/enrichment/enrich-target-job.test.ts`
- Create: `inngest/functions/enrich-target.ts`
- Create: `inngest/functions/enrich-targets-bulk.ts`
- Create: `app/api/crm/targets/enrich-bulk/route.ts`
- Modify: `app/api/inngest/route.ts`

- [ ] **Step 1: Write failing dedup tests**

Create `__tests__/enrichment/enrich-target-job.test.ts`:

```typescript
import { shouldSkipTargetEnrichment } from "@/inngest/functions/enrich-target";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

describe("shouldSkipTargetEnrichment", () => {
  it("returns false when no recent completed record exists", () => {
    expect(shouldSkipTargetEnrichment(null)).toBe(false);
  });

  it("returns true when completed record is within last 7 days", () => {
    const recentDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    expect(shouldSkipTargetEnrichment(recentDate)).toBe(true);
  });

  it("returns false when completed record is older than 7 days", () => {
    const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    expect(shouldSkipTargetEnrichment(oldDate)).toBe(false);
  });

  it("returns false exactly past the 7-day boundary", () => {
    const exactDate = new Date(Date.now() - SEVEN_DAYS_MS - 1000);
    expect(shouldSkipTargetEnrichment(exactDate)).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

```bash
pnpm jest __tests__/enrichment/enrich-target-job.test.ts --no-coverage 2>&1 | tail -10
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create enrich-target.ts**

Create `inngest/functions/enrich-target.ts`:

```typescript
import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { AgentEnrichmentStrategy } from "@/lib/enrichment/strategies/agent-enrichment-strategy";
import { isFieldEmpty } from "@/lib/enrichment/utils/field-utils";
import type { EnrichmentField } from "@/lib/enrichment/types";
import type { StoredEnrichmentResult } from "@/lib/enrichment/types/stored-result";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/** Exported for unit testing. */
export function shouldSkipTargetEnrichment(lastCompletedAt: Date | null): boolean {
  if (!lastCompletedAt) return false;
  return Date.now() - lastCompletedAt.getTime() < SEVEN_DAYS_MS;
}

const contactFieldMap = {
  position:         "position",
  company:          "company",
  company_website:  "company_website",
  personal_website: "personal_website",
  mobile_phone:     "mobile_phone",
  office_phone:     "office_phone",
  social_linkedin:  "social_linkedin",
  social_x:         "social_x",
  social_instagram: "social_instagram",
  social_facebook:  "social_facebook",
} as const;

export const enrichTarget = inngest.createFunction(
  {
    id: "enrich-target",
    name: "Enrich Target",
    triggers: [{ event: "enrich/target.run" }],
    retries: 3,
  },
  async ({ event }) => {
    const { contactId: targetId, enrichmentId, fields } = event.data as {
      contactId: string;
      enrichmentId: string;
      fields: EnrichmentField[];
    };

    const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;

    await prismadb.crm_Target_Enrichment.update({
      where: { id: enrichmentId },
      data: { status: "RUNNING" },
    });

    const target = await prismadb.crm_Targets.findUnique({
      where: { id: targetId },
      select: {
        id: true,
        email: true,
        position: true,
        company: true,
        company_website: true,
        personal_website: true,
        mobile_phone: true,
        office_phone: true,
        social_linkedin: true,
        social_x: true,
        social_instagram: true,
        social_facebook: true,
      },
    });

    if (!target?.email) {
      await prismadb.crm_Target_Enrichment.update({
        where: { id: enrichmentId },
        data: { status: "SKIPPED", error: "No email on target" },
      });
      return { skipped: "no email" };
    }

    const recentEnrichment = await prismadb.crm_Target_Enrichment.findFirst({
      where: {
        targetId,
        status: "COMPLETED",
        createdAt: { gte: new Date(Date.now() - SEVEN_DAYS_MS) },
      },
      select: { createdAt: true },
    });

    if (shouldSkipTargetEnrichment(recentEnrichment?.createdAt ?? null)) {
      await prismadb.crm_Target_Enrichment.update({
        where: { id: enrichmentId },
        data: { status: "SKIPPED", error: "Enriched within last 7 days" },
      });
      return { skipped: "recently enriched" };
    }

    const strategy = new AgentEnrichmentStrategy(openaiApiKey!, firecrawlApiKey!);
    const result = await strategy.enrichRow({ email: target.email }, fields, "email");

    const stored: StoredEnrichmentResult = {
      enrichments: result.enrichments,
      status: result.status as "completed" | "error" | "skipped",
      error: result.error,
    };

    const updates: Record<string, string> = {};
    for (const [fieldName, enrichment] of Object.entries(result.enrichments)) {
      const contactColumn = contactFieldMap[fieldName as keyof typeof contactFieldMap];
      if (!contactColumn) continue;
      const currentValue = target[contactColumn] as string | null;
      if (isFieldEmpty(currentValue) && enrichment.value) {
        updates[contactColumn] = String(enrichment.value);
      }
    }

    if (Object.keys(updates).length > 0) {
      await prismadb.crm_Targets.update({
        where: { id: targetId },
        data: updates,
      });
    }

    await prismadb.crm_Target_Enrichment.update({
      where: { id: enrichmentId },
      data: { status: "COMPLETED", result: stored as object },
    });

    return { enriched: true, fieldsApplied: Object.keys(updates) };
  }
);
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm jest __tests__/enrichment/enrich-target-job.test.ts --no-coverage 2>&1 | tail -10
```

Expected: PASS (4 tests).

- [ ] **Step 5: Create fan-out function**

Create `inngest/functions/enrich-targets-bulk.ts`:

```typescript
import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import type { EnrichmentField } from "@/lib/enrichment/types";

export const enrichTargetsBulk = inngest.createFunction(
  {
    id: "enrich-targets-bulk",
    name: "Enrich Targets Bulk",
    triggers: [{ event: "enrich/targets.bulk" }],
  },
  async ({ event, step }) => {
    const { contactIds: targetIds, fields, triggeredBy } = event.data as {
      contactIds: string[];
      fields: EnrichmentField[];
      triggeredBy?: string;
    };

    const records = await step.run("create-enrichment-records", async () => {
      const created = await Promise.all(
        targetIds.map((targetId) =>
          prismadb.crm_Target_Enrichment.create({
            data: {
              targetId,
              status: "PENDING",
              fields: fields.map((f) => f.name),
              triggeredBy: triggeredBy ?? null,
            },
            select: { id: true, targetId: true },
          })
        )
      );
      return created;
    });

    await step.sendEvent(
      "fan-out-target-enrichments",
      records.map((r: { id: string; targetId: string }) => ({
        name: "enrich/target.run",
        data: { contactId: r.targetId, enrichmentId: r.id, fields },
      }))
    );

    return { dispatched: records.length };
  }
);
```

- [ ] **Step 6: Create bulk API route**

Create `app/api/crm/targets/enrich-bulk/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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
    return NextResponse.json({ error: "Maximum 100 targets per batch" }, { status: 400 });
  }
  if (!Array.isArray(fields) || fields.length === 0) {
    return NextResponse.json({ error: "fields must be a non-empty array" }, { status: 400 });
  }

  await inngest.send({
    name: "enrich/targets.bulk",
    data: { contactIds, fields, triggeredBy: session.user.id },
  });

  return NextResponse.json({ success: true, count: contactIds.length });
}
```

- [ ] **Step 7: Register both functions in Inngest route**

Open `app/api/inngest/route.ts`. Add two imports after existing ones:

```typescript
import { enrichTarget } from "@/inngest/functions/enrich-target";
import { enrichTargetsBulk } from "@/inngest/functions/enrich-targets-bulk";
```

Append to the `functions: [...]` array:
```typescript
    enrichTarget,
    enrichTargetsBulk,
```

- [ ] **Step 8: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -E "enrich-target|enrich-targets|inngest/route" | head -15
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add \
  inngest/functions/enrich-target.ts \
  inngest/functions/enrich-targets-bulk.ts \
  "app/api/crm/targets/enrich-bulk/route.ts" \
  app/api/inngest/route.ts \
  "__tests__/enrichment/enrich-target-job.test.ts"
git commit -m "feat: add target enrichment Inngest jobs, bulk route, and registration"
```

---

## Task 4: EnrichTargetDrawer + EnrichButton

**Files:**
- Create: `app/[locale]/(routes)/crm/targets/[targetId]/components/EnrichTargetDrawer.tsx`
- Create: `app/[locale]/(routes)/crm/targets/[targetId]/components/EnrichButton.tsx`

- [ ] **Step 1: Create EnrichTargetDrawer**

Create `app/[locale]/(routes)/crm/targets/[targetId]/components/EnrichTargetDrawer.tsx`:

```tsx
"use client";

import { useState, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

interface TargetCurrentData {
  position?: string | null;
  company?: string | null;
  company_website?: string | null;
  personal_website?: string | null;
  mobile_phone?: string | null;
  office_phone?: string | null;
  social_linkedin?: string | null;
  social_x?: string | null;
  social_instagram?: string | null;
  social_facebook?: string | null;
}

interface EnrichTargetDrawerProps {
  targetId: string;
  targetEmail: string | null;
  targetCurrentData: TargetCurrentData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplied: () => void;
}

// Target-specific preset fields (10 fields with crm_Targets column mappings)
const TARGET_PRESET_FIELDS: EnrichmentField[] = [
  { name: "position",         displayName: "Position / Job Title",  description: "The target's job title or role", type: "string", required: false },
  { name: "company",          displayName: "Company Name",           description: "The target's company name", type: "string", required: false },
  { name: "company_website",  displayName: "Company Website",        description: "The company's official website URL", type: "string", required: false },
  { name: "personal_website", displayName: "Personal Website",       description: "The target's personal website URL", type: "string", required: false },
  { name: "mobile_phone",     displayName: "Mobile Phone",           description: "The target's mobile phone number", type: "string", required: false },
  { name: "office_phone",     displayName: "Office Phone",           description: "The target's office phone number", type: "string", required: false },
  { name: "social_linkedin",  displayName: "LinkedIn URL",           description: "The target's LinkedIn profile URL", type: "string", required: false },
  { name: "social_x",         displayName: "Twitter / X URL",        description: "The target's Twitter/X profile URL", type: "string", required: false },
  { name: "social_instagram", displayName: "Instagram URL",          description: "The target's Instagram profile URL", type: "string", required: false },
  { name: "social_facebook",  displayName: "Facebook URL",           description: "The target's Facebook profile URL", type: "string", required: false },
];

export function EnrichTargetDrawer({
  targetId,
  targetEmail,
  targetCurrentData,
  open,
  onOpenChange,
  onApplied,
}: EnrichTargetDrawerProps) {
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

    const response = await fetch("/api/crm/targets/enrich", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId: targetId, fields }),
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
          setSelectedApply(new Set(Object.keys(event.result.enrichments)));
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
      await fetch(`/api/crm/targets/enrich?sessionId=${sessionId}`, { method: "DELETE" });
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

    const res = await fetch(`/api/crm/targets/${targetId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enrichmentFields: updates }),
    });

    if (res.ok) {
      toast.success("Target enriched successfully");
      onApplied();
      handleClose(false);
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Failed to apply enrichment");
    }
    setApplying(false);
  };

  const noEmail = !targetEmail;

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
              ? "Add an email to this target to enable enrichment."
              : "Firecrawl searches the web to fill in missing target details."}
          </SheetDescription>
        </SheetHeader>

        {noEmail && (
          <div className="mt-4 text-sm text-muted-foreground">
            No email address found on this target.
          </div>
        )}

        {!noEmail && step === "select" && (
          <div className="mt-4">
            <EnrichFieldSelector
              onStart={handleStart}
              presetFields={TARGET_PRESET_FIELDS}
              defaultSelected={["position", "company", "social_linkedin", "company_website"]}
            />
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
                    <th className="text-left pb-2">Current</th>
                    <th className="text-left pb-2">Enriched</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(result.enrichments).map(([fieldName, enrichment]) => {
                    const currentValue = (targetCurrentData as Record<string, string | null | undefined>)[fieldName];
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

**IMPORTANT — EnrichFieldSelector props change:** The drawer above passes `presetFields` and `defaultSelected` props to `EnrichFieldSelector`. You must update `EnrichFieldSelector` to accept these optional props so it stays reusable. See Step 2.

- [ ] **Step 2: Update EnrichFieldSelector to accept optional props**

Modify `app/[locale]/(routes)/crm/contacts/components/EnrichFieldSelector.tsx`.

Change the interface:
```typescript
interface EnrichFieldSelectorProps {
  onStart: (fields: EnrichmentField[]) => void;
  loading?: boolean;
  presetFields?: EnrichmentField[];
  defaultSelected?: string[];
}
```

Update the function signature and initial state:
```typescript
export function EnrichFieldSelector({
  onStart,
  loading,
  presetFields = PRESET_FIELDS,
  defaultSelected = ["position", "social_linkedin", "website", "description"],
}: EnrichFieldSelectorProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(defaultSelected));
```

Replace all uses of `PRESET_FIELDS` in JSX with `presetFields`.

- [ ] **Step 3: Create EnrichButton**

Create `app/[locale]/(routes)/crm/targets/[targetId]/components/EnrichButton.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { EnrichTargetDrawer } from "./EnrichTargetDrawer";

interface EnrichButtonProps {
  targetId: string;
  targetEmail: string | null;
  targetCurrentData: {
    position?: string | null;
    company?: string | null;
    company_website?: string | null;
    personal_website?: string | null;
    mobile_phone?: string | null;
    office_phone?: string | null;
    social_linkedin?: string | null;
    social_x?: string | null;
    social_instagram?: string | null;
    social_facebook?: string | null;
  };
}

export function EnrichButton({ targetId, targetEmail, targetCurrentData }: EnrichButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={!targetEmail}
        title={!targetEmail ? "Add an email to enable enrichment" : "Enrich with AI"}
      >
        <Sparkles className="h-4 w-4 mr-1 text-orange-500" />
        Enrich with AI
      </Button>
      <EnrichTargetDrawer
        targetId={targetId}
        targetEmail={targetEmail}
        targetCurrentData={targetCurrentData}
        open={open}
        onOpenChange={setOpen}
        onApplied={() => window.location.reload()}
      />
    </>
  );
}
```

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -E "EnrichTarget|EnrichButton|EnrichFieldSelector" | head -15
```

Fix any errors (likely from the `presetFields`/`defaultSelected` props change).

- [ ] **Step 5: Commit**

```bash
git add \
  "app/[locale]/(routes)/crm/targets/[targetId]/components/EnrichTargetDrawer.tsx" \
  "app/[locale]/(routes)/crm/targets/[targetId]/components/EnrichButton.tsx" \
  "app/[locale]/(routes)/crm/contacts/components/EnrichFieldSelector.tsx"
git commit -m "feat: add EnrichTargetDrawer and EnrichButton, extend EnrichFieldSelector with optional props"
```

---

## Task 5: Wire EnrichButton into targets BasicView

**Files:**
- Modify: `app/[locale]/(routes)/crm/targets/[targetId]/components/BasicView.tsx`

The current `BasicView` has this structure around line 44:
```tsx
<div>
  <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
</div>
```

- [ ] **Step 1: Add import**

At the top of `BasicView.tsx`, add:
```typescript
import { EnrichButton } from "./EnrichButton";
```

- [ ] **Step 2: Replace the MoreHorizontal div**

Replace:
```tsx
<div>
  <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
</div>
```

With:
```tsx
<div className="flex items-center gap-2">
  <EnrichButton
    targetId={data.id}
    targetEmail={data.email ?? null}
    targetCurrentData={{
      position:         data.position ?? null,
      company:          data.company ?? null,
      company_website:  data.company_website ?? null,
      personal_website: data.personal_website ?? null,
      mobile_phone:     data.mobile_phone ?? null,
      office_phone:     data.office_phone ?? null,
      social_linkedin:  data.social_linkedin ?? null,
      social_x:         data.social_x ?? null,
      social_instagram: data.social_instagram ?? null,
      social_facebook:  data.social_facebook ?? null,
    }}
  />
  <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
</div>
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep "BasicView" | head -10
```

Expected: no new errors (pre-existing `user` parameter errors are unrelated and pre-date this feature).

- [ ] **Step 4: Commit**

```bash
git add "app/[locale]/(routes)/crm/targets/[targetId]/components/BasicView.tsx"
git commit -m "feat: add Enrich with AI button to target detail page"
```

---

## Task 6: Bulk selection + BulkEnrichTargetsModal in targets list

**Files:**
- Modify: `app/[locale]/(routes)/crm/targets/table-components/columns.tsx`
- Modify: `app/[locale]/(routes)/crm/targets/table-components/data-table.tsx`
- Create: `app/[locale]/(routes)/crm/targets/components/BulkEnrichTargetsModal.tsx`

- [ ] **Step 1: Read both files**

```bash
cat "app/[locale]/(routes)/crm/targets/table-components/columns.tsx" | head -20
cat "app/[locale]/(routes)/crm/targets/table-components/data-table.tsx"
```

Note: `columns.tsx` uses `export const columns: ColumnDef<Target>[]` (plain array, NOT a function).

- [ ] **Step 2: Add checkbox to columns.tsx**

Add import at top of `columns.tsx`:
```typescript
import { Checkbox } from "@/components/ui/checkbox";
```

Add as the FIRST entry in the `columns` array (before the `created_on` column):
```typescript
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
        onClick={(e) => e.stopPropagation()}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
```

- [ ] **Step 3: Create BulkEnrichTargetsModal**

Create `app/[locale]/(routes)/crm/targets/components/BulkEnrichTargetsModal.tsx`:

```tsx
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { EnrichFieldSelector } from "./EnrichFieldSelector";
import type { EnrichmentField } from "@/lib/enrichment/types";

const TARGET_PRESET_FIELDS: EnrichmentField[] = [
  { name: "position",         displayName: "Position / Job Title",  description: "The target's job title or role", type: "string", required: false },
  { name: "company",          displayName: "Company Name",           description: "The target's company name", type: "string", required: false },
  { name: "company_website",  displayName: "Company Website",        description: "The company's official website URL", type: "string", required: false },
  { name: "personal_website", displayName: "Personal Website",       description: "The target's personal website URL", type: "string", required: false },
  { name: "mobile_phone",     displayName: "Mobile Phone",           description: "The target's mobile phone number", type: "string", required: false },
  { name: "office_phone",     displayName: "Office Phone",           description: "The target's office phone number", type: "string", required: false },
  { name: "social_linkedin",  displayName: "LinkedIn URL",           description: "The target's LinkedIn profile URL", type: "string", required: false },
  { name: "social_x",         displayName: "Twitter / X URL",        description: "The target's Twitter/X profile URL", type: "string", required: false },
  { name: "social_instagram", displayName: "Instagram URL",          description: "The target's Instagram profile URL", type: "string", required: false },
  { name: "social_facebook",  displayName: "Facebook URL",           description: "The target's Facebook profile URL", type: "string", required: false },
];

interface BulkEnrichTargetsModalProps {
  targetIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BulkEnrichTargetsModal({ targetIds, open, onOpenChange }: BulkEnrichTargetsModalProps) {
  const [loading, setLoading] = useState(false);

  const handleStart = async (fields: EnrichmentField[]) => {
    setLoading(true);
    try {
      const res = await fetch("/api/crm/targets/enrich-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactIds: targetIds, fields }),
      });
      if (res.ok) {
        toast.success(`Enrichment started for ${targetIds.length} targets. Check the Enrichment Jobs page for progress.`);
        onOpenChange(false);
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Failed to start bulk enrichment");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Enrich {targetIds.length} targets</DialogTitle>
          <DialogDescription>
            Select fields to enrich. Firecrawl will run in the background.
            Only empty fields will be filled — existing data is never overwritten.
          </DialogDescription>
        </DialogHeader>
        <EnrichFieldSelector
          onStart={handleStart}
          loading={loading}
          presetFields={TARGET_PRESET_FIELDS}
          defaultSelected={["position", "company", "social_linkedin", "company_website"]}
        />
      </DialogContent>
    </Dialog>
  );
}
```

**Note:** `BulkEnrichTargetsModal` imports `EnrichFieldSelector` from `./EnrichFieldSelector`. You must check if there is a `EnrichFieldSelector.tsx` file in `app/[locale]/(routes)/crm/targets/components/`. If not, create a re-export:

```bash
ls "app/[locale]/(routes)/crm/targets/components/"
```

If `EnrichFieldSelector.tsx` does not exist there, create `app/[locale]/(routes)/crm/targets/components/EnrichFieldSelector.tsx` as a re-export:
```typescript
export { EnrichFieldSelector } from "../../contacts/components/EnrichFieldSelector";
```

- [ ] **Step 4: Add bulk toolbar to data-table.tsx**

In `app/[locale]/(routes)/crm/targets/table-components/data-table.tsx`, add:

1. Imports (after existing imports):
```typescript
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BulkEnrichTargetsModal } from "../components/BulkEnrichTargetsModal";
```

2. State (inside component, after existing state):
```typescript
const [bulkEnrichOpen, setBulkEnrichOpen] = React.useState(false);
```

3. In JSX, after `<DataTableToolbar table={table} />` and before the table `<div>`, add:
```tsx
{table.getSelectedRowModel().rows.length > 0 && (
  <>
    <div className="flex items-center gap-2 py-2 px-1 bg-muted/50 rounded-md border">
      <span className="text-sm text-muted-foreground">
        {table.getSelectedRowModel().rows.length} selected
      </span>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setBulkEnrichOpen(true)}
      >
        <Sparkles className="h-4 w-4 mr-1 text-orange-500" />
        Enrich {table.getSelectedRowModel().rows.length} targets
      </Button>
    </div>
    <BulkEnrichTargetsModal
      targetIds={table.getSelectedRowModel().rows.map((row) => (row.original as { id: string }).id)}
      open={bulkEnrichOpen}
      onOpenChange={setBulkEnrichOpen}
    />
  </>
)}
```

You'll need to find where `<DataTableToolbar table={table} />` is and where the table `<div className="rounded-md border">` begins. Read the file carefully and insert the block between them.

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -E "BulkEnrich|targets/table-components|targets/components" | head -15
```

Fix any errors.

- [ ] **Step 6: Commit**

```bash
git add \
  "app/[locale]/(routes)/crm/targets/table-components/columns.tsx" \
  "app/[locale]/(routes)/crm/targets/table-components/data-table.tsx" \
  "app/[locale]/(routes)/crm/targets/components/BulkEnrichTargetsModal.tsx"
# Also add re-export if created:
git add "app/[locale]/(routes)/crm/targets/components/EnrichFieldSelector.tsx" 2>/dev/null || true
git commit -m "feat: add bulk target selection and BulkEnrichTargetsModal"
```

---

## Task 7: Enrichment Jobs status page

**Files:**
- Create: `app/[locale]/(routes)/crm/targets/enrichment/page.tsx`
- Create: `app/[locale]/(routes)/crm/targets/enrichment/RetryEnrichmentButton.tsx`

- [ ] **Step 1: Create RetryEnrichmentButton**

Create `app/[locale]/(routes)/crm/targets/enrichment/RetryEnrichmentButton.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface RetryEnrichmentButtonProps {
  targetId: string;
  fields: string[];
}

export function RetryEnrichmentButton({ targetId, fields }: RetryEnrichmentButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleRetry = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/crm/targets/enrich-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactIds: [targetId],
          fields: fields.map((name) => ({
            name,
            displayName: name,
            description: `Find ${name}`,
            type: "string",
            required: false,
          })),
        }),
      });
      if (res.ok) {
        toast.success("Retry queued. Refresh to see updated status.");
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Failed to retry");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleRetry} disabled={loading}>
      <RotateCcw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} />
      Retry
    </Button>
  );
}
```

- [ ] **Step 2: Create jobs page**

Create `app/[locale]/(routes)/crm/targets/enrichment/page.tsx`:

```tsx
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, RefreshCw } from "lucide-react";
import moment from "moment";
import { RetryEnrichmentButton } from "./RetryEnrichmentButton";

export const dynamic = "force-dynamic";

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING:   "secondary",
  RUNNING:   "default",
  COMPLETED: "default",
  FAILED:    "destructive",
  SKIPPED:   "outline",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING:   "Pending",
  RUNNING:   "Running",
  COMPLETED: "Completed",
  FAILED:    "Failed",
  SKIPPED:   "Skipped",
};

export default async function TargetEnrichmentJobsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/sign-in");

  const records = await prismadb.crm_Target_Enrichment.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      target: {
        select: { id: true, first_name: true, last_name: true, email: true },
      },
      triggered_by_user: {
        select: { name: true },
      },
    },
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-orange-500" />
          <h1 className="text-2xl font-semibold">Target Enrichment Jobs</h1>
        </div>
        <Link href="." className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {records.length} enrichment job{records.length !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Target</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Fields</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>By</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No enrichment jobs yet. Start one from the targets list.
                  </TableCell>
                </TableRow>
              )}
              {records.map((record) => (
                <TableRow key={record.id} className={record.status === "RUNNING" ? "bg-muted/30" : ""}>
                  <TableCell>
                    <Link
                      href={`/crm/targets/${record.target.id}`}
                      className="font-medium hover:underline"
                    >
                      {record.target.first_name} {record.target.last_name}
                    </Link>
                    {record.target.email && (
                      <div className="text-xs text-muted-foreground">{record.target.email}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANTS[record.status] ?? "secondary"}>
                      {STATUS_LABELS[record.status] ?? record.status}
                    </Badge>
                    {record.error && (
                      <div className="text-xs text-muted-foreground mt-1 max-w-[200px] truncate" title={record.error}>
                        {record.error}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {record.fields.join(", ")}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {moment(record.createdAt).fromNow()}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {record.triggered_by_user?.name ?? "—"}
                  </TableCell>
                  <TableCell>
                    {record.status === "FAILED" && (
                      <RetryEnrichmentButton
                        targetId={record.target.id}
                        fields={record.fields}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -E "targets/enrichment" | head -10
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "app/[locale]/(routes)/crm/targets/enrichment/"
git commit -m "feat: add target enrichment jobs status page"
```

---

## Task 8: Smoke test + build check

- [ ] **Step 1: Run all enrichment tests**

```bash
pnpm jest __tests__/enrichment/ --no-coverage 2>&1 | tail -15
```

Expected: all tests pass (now includes enrich-target-route × 3 and enrich-target-job × 4 in addition to existing 12).

- [ ] **Step 2: Full TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules\|\.next\|jiti\|pnpm" | grep "error TS" | head -20
```

Expected: no errors for files we wrote.

- [ ] **Step 3: Build check**

```bash
pnpm build 2>&1 | tail -20
```

Expected: successful build. Fix any errors.

- [ ] **Step 4: Verify all files committed**

```bash
git status
```

Commit any remaining uncommitted files.

- [ ] **Step 5: Final commit log**

```bash
git log --oneline main..HEAD
```
