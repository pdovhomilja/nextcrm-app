# AQUNAMA Phase 1 — Compliance & Flow Glue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the NextCRM target/campaign pipeline compliant and connected for the AQUNAMA sales process: global email opt-out honored everywhere, one-click target→deal conversion, a `delivery_deadline` field on opportunities, and XLSX import.

**Architecture:** All changes ride on existing subsystems. A `do_not_email` flag on `crm_Targets` becomes the single global suppression signal, set by the existing unsubscribe endpoint and enforced by shared query-builder helpers wired into the three Inngest campaign functions plus the import action. Conversion reuses the existing `convertTarget` action and appends an opportunity at the lowest-order sales stage with campaign attribution. XLSX support is a shared `parseSpreadsheetFile` helper (Papa for CSV, dynamically-imported ExcelJS for XLSX) used by both the server action and the import modal.

**Tech Stack:** Next.js 16 (App Router, server actions), Prisma 7 (PostgreSQL), Inngest 4, Jest 30 (`ts-jest`), papaparse, exceljs (new dep), shadcn/ui, pnpm.

**Context docs:** `docs/internal/aqunama-sales-process-gap-analysis.md` (gaps G-02, G-06, G-08, G-09), `docs/internal/matej-sales-projecesses.md` (spec).

## Global Constraints

- Package manager: **pnpm**. Run tests with `pnpm test -- <path>` (jest), typecheck with `pnpm exec tsc --noEmit`.
- Prisma migrations: `pnpm exec prisma migrate dev --name <name>` (requires local PostgreSQL from `.env`); `migrate dev` regenerates the client automatically.
- Server actions: `"use server"` at top, auth via `getSession()` from `@/lib/auth-server`, return `{ error: string }` objects instead of throwing (match `actions/crm/targets/convert-target.ts`).
- Tests mock `@/lib/prisma` and `@/lib/auth-server` with `jest.mock` at file top, before imports (match `actions/campaigns/__tests__/send-campaign-now-scope.test.ts`).
- Conventional commits (`feat(scope): …`), committed on the `dev` branch. Do not push or open PRs as part of this plan.
- All soft-deleted rows are excluded with `deletedAt: null` where the surrounding code already does so; do not add new soft-delete handling.
- Path alias `@/` maps to the repo root.

---

### Task 1: Schema — global opt-out flag + delivery deadline

**Files:**
- Modify: `prisma/schema.prisma` (model `crm_Targets` at ~line 1212, model `crm_Opportunities` at ~line 196)

**Interfaces:**
- Consumes: nothing (first task).
- Produces: `crm_Targets.do_not_email: boolean` (default `false`), `crm_Targets.do_not_email_at: Date | null`, `crm_Opportunities.delivery_deadline: Date | null`. All later tasks rely on these generated Prisma client fields.

- [ ] **Step 1: Add fields to `crm_Targets`**

In `prisma/schema.prisma`, inside `model crm_Targets`, directly below the line `status           Boolean   @default(true)`, add:

```prisma
  do_not_email     Boolean   @default(false)
  do_not_email_at  DateTime?
```

And add one index line next to the existing `@@index` block of the same model:

```prisma
  @@index([do_not_email])
```

- [ ] **Step 2: Add field to `crm_Opportunities`**

Inside `model crm_Opportunities`, directly below the line `close_date       DateTime?`, add:

```prisma
  delivery_deadline DateTime?
```

- [ ] **Step 3: Create the migration**

Run: `pnpm exec prisma migrate dev --name aqunama_p1_optout_and_delivery_deadline`
Expected: migration created under `prisma/migrations/…_aqunama_p1_optout_and_delivery_deadline/`, applied, and `✔ Generated Prisma Client` printed. (If no local DB is reachable, run `pnpm exec prisma migrate diff` to author the SQL and stop — do not fake an applied migration.)

- [ ] **Step 4: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: exit 0, no new errors.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(crm): add global do_not_email flag on targets and delivery_deadline on opportunities"
```

---

### Task 2: Unsubscribe endpoint sets the global opt-out

**Files:**
- Modify: `app/api/campaigns/unsubscribe/route.ts`
- Test: `__tests__/campaigns/api/unsubscribe-global-optout.test.ts` (new)

**Interfaces:**
- Consumes: `crm_Targets.do_not_email` / `do_not_email_at` from Task 1; existing route behavior (token lookup on `crm_campaign_sends`).
- Produces: unsubscribing via token now also sets `do_not_email = true` on **every** target sharing the send's target id or email address. No exported API changes.

- [ ] **Step 1: Write the failing test**

Create `__tests__/campaigns/api/unsubscribe-global-optout.test.ts`:

```ts
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_campaign_sends: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    crm_Targets: {
      updateMany: jest.fn(),
    },
  },
}));

import { NextRequest } from "next/server";
import { prismadb } from "@/lib/prisma";
import { GET } from "@/app/api/campaigns/unsubscribe/route";

describe("unsubscribe global opt-out", () => {
  beforeEach(() => jest.clearAllMocks());

  it("suppresses all targets with the send's id or email", async () => {
    (prismadb.crm_campaign_sends.findUnique as jest.Mock).mockResolvedValue({
      id: "send-1",
      target_id: "t-1",
      email: "jane@acme.com",
      unsubscribed_at: null,
    });
    (prismadb.crm_campaign_sends.update as jest.Mock).mockResolvedValue({});
    (prismadb.crm_Targets.updateMany as jest.Mock).mockResolvedValue({ count: 2 });

    const res = await GET(
      new NextRequest("http://localhost/api/campaigns/unsubscribe?token=tok-1")
    );

    expect(res.status).toBe(200);
    expect(prismadb.crm_Targets.updateMany).toHaveBeenCalledWith({
      where: {
        do_not_email: false,
        OR: [{ id: "t-1" }, { email: "jane@acme.com" }],
      },
      data: { do_not_email: true, do_not_email_at: expect.any(Date) },
    });
  });

  it("still suppresses targets when the send was already unsubscribed", async () => {
    (prismadb.crm_campaign_sends.findUnique as jest.Mock).mockResolvedValue({
      id: "send-1",
      target_id: "t-1",
      email: "jane@acme.com",
      unsubscribed_at: new Date("2026-01-01"),
    });
    (prismadb.crm_Targets.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

    await GET(new NextRequest("http://localhost/api/campaigns/unsubscribe?token=tok-1"));

    expect(prismadb.crm_campaign_sends.update).not.toHaveBeenCalled();
    expect(prismadb.crm_Targets.updateMany).toHaveBeenCalledTimes(1);
  });

  it("does not touch targets for an unknown token", async () => {
    (prismadb.crm_campaign_sends.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await GET(
      new NextRequest("http://localhost/api/campaigns/unsubscribe?token=bad")
    );

    expect(res.status).toBe(404);
    expect(prismadb.crm_Targets.updateMany).not.toHaveBeenCalled();
  });
});
```

(If `next/server` cannot be imported under jest in this repo, fall back to the simulation style used in `__tests__/campaigns/api/unsubscribe.test.ts` — but try the real-handler import first; Node ≥ 20 provides the `Request` global jest needs.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- __tests__/campaigns/api/unsubscribe-global-optout.test.ts`
Expected: FAIL — `crm_Targets.updateMany` not called (route doesn't do it yet).

- [ ] **Step 3: Implement the route change**

In `app/api/campaigns/unsubscribe/route.ts`, after the existing `if (!send.unsubscribed_at) { … }` block and before the final `return new NextResponse(…)`, add:

```ts
  // Global suppression: never email this address again, from any campaign.
  await prismadb.crm_Targets.updateMany({
    where: {
      do_not_email: false,
      OR: [{ id: send.target_id }, { email: send.email }],
    },
    data: { do_not_email: true, do_not_email_at: new Date() },
  });
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- __tests__/campaigns/api/`
Expected: PASS (new file, and the pre-existing `unsubscribe.test.ts` still green).

- [ ] **Step 5: Commit**

```bash
git add app/api/campaigns/unsubscribe/route.ts __tests__/campaigns/api/unsubscribe-global-optout.test.ts
git commit -m "feat(campaigns): unsubscribe sets global do_not_email suppression on targets"
```

---

### Task 3: Enforce suppression in the send pipeline and import

**Files:**
- Create: `lib/campaigns/recipient-filters.ts`
- Modify: `inngest/functions/campaigns/send-now.ts` (`resolve-recipients` step, ~lines 20–36)
- Modify: `inngest/functions/campaigns/schedule-send.ts` (`resolve-recipients` step, ~lines 39–59 — identical block to send-now)
- Modify: `inngest/functions/campaigns/process-follow-up.ts` (`filter-recipients` step, ~lines 37–47)
- Modify: `actions/crm/targets/import-targets.ts` (before the `createMany`, ~line 76)
- Test: `__tests__/campaigns/recipient-filters.test.ts` (new)
- Test: `__tests__/actions/import-targets-suppression.test.ts` (new)

**Interfaces:**
- Consumes: `crm_Targets.do_not_email` from Task 1.
- Produces: `subscribedTargetsInclude(): Prisma.crm_TargetListsInclude` and `eligibleFollowUpSendsWhere(step0Id: string, sendTo: string | null): Prisma.crm_campaign_sendsWhereInput` exported from `lib/campaigns/recipient-filters.ts`. `importTargets` marks re-imported suppressed emails as `do_not_email: true`.

- [ ] **Step 1: Write the failing tests for the query builders**

Create `__tests__/campaigns/recipient-filters.test.ts`:

```ts
import {
  subscribedTargetsInclude,
  eligibleFollowUpSendsWhere,
} from "@/lib/campaigns/recipient-filters";

describe("recipient-filters", () => {
  it("subscribedTargetsInclude excludes opted-out targets", () => {
    expect(subscribedTargetsInclude()).toEqual({
      targets: {
        where: { target: { do_not_email: false } },
        include: { target: { select: { id: true, email: true } } },
      },
    });
  });

  it("eligibleFollowUpSendsWhere for send_to=all", () => {
    expect(eligibleFollowUpSendsWhere("step-0", "all")).toEqual({
      step_id: "step-0",
      status: { in: ["sent", "delivered"] },
      unsubscribed_at: null,
      target: { do_not_email: false },
    });
  });

  it("eligibleFollowUpSendsWhere for send_to=non_openers adds opened_at filter", () => {
    expect(eligibleFollowUpSendsWhere("step-0", "non_openers")).toEqual({
      step_id: "step-0",
      status: { in: ["sent", "delivered"] },
      unsubscribed_at: null,
      target: { do_not_email: false },
      opened_at: null,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- __tests__/campaigns/recipient-filters.test.ts`
Expected: FAIL — module `lib/campaigns/recipient-filters` does not exist.

- [ ] **Step 3: Implement `lib/campaigns/recipient-filters.ts`**

```ts
import { Prisma } from "@prisma/client";

// Shared by campaign send-now / schedule-send "resolve-recipients":
// join only targets that have not globally opted out of email.
export function subscribedTargetsInclude() {
  return {
    targets: {
      where: { target: { do_not_email: false } },
      include: { target: { select: { id: true, email: true } } },
    },
  } satisfies Prisma.crm_TargetListsInclude;
}

// Shared by campaign process-follow-up "filter-recipients":
// a follow-up goes only to recipients whose step-0 send landed,
// who did not unsubscribe, and whose target is not globally suppressed.
export function eligibleFollowUpSendsWhere(step0Id: string, sendTo: string | null) {
  return {
    step_id: step0Id,
    status: { in: ["sent", "delivered"] },
    unsubscribed_at: null,
    target: { do_not_email: false },
    ...(sendTo === "non_openers" ? { opened_at: null } : {}),
  } satisfies Prisma.crm_campaign_sendsWhereInput;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- __tests__/campaigns/recipient-filters.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire the include into `send-now.ts` and `schedule-send.ts`**

In both files, add the import:

```ts
import { subscribedTargetsInclude } from "@/lib/campaigns/recipient-filters";
```

and inside the `resolve-recipients` step replace the `include` object of the `crm_TargetLists.findMany` call:

```ts
      const lists = await prismadb.crm_TargetLists.findMany({
        where: { campaign_lists: { some: { campaign_id: campaignId } } },
        include: subscribedTargetsInclude(),
      });
```

The dedupe loop below the query stays unchanged.

- [ ] **Step 6: Wire the where into `process-follow-up.ts`**

Add the import:

```ts
import { eligibleFollowUpSendsWhere } from "@/lib/campaigns/recipient-filters";
```

and replace the body of the `filter-recipients` step's `findMany`:

```ts
    const eligibleTargets = await step.run("filter-recipients", async () => {
      return prismadb.crm_campaign_sends.findMany({
        where: eligibleFollowUpSendsWhere(step0.id, followUpStep.send_to),
        select: { target_id: true, email: true },
      });
    });
```

- [ ] **Step 7: Write the failing test for import suppression inheritance**

Create `__tests__/actions/import-targets-suppression.test.ts`:

```ts
jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Targets: { createMany: jest.fn(), findMany: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { importTargets } from "@/actions/crm/targets/import-targets";

describe("importTargets suppression inheritance", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSession as jest.Mock).mockResolvedValue({ user: { id: "u1" } });
    (prismadb.crm_Targets.createMany as jest.Mock).mockResolvedValue({ count: 2 });
  });

  const makeFormData = (csv: string) => {
    const fd = new FormData();
    fd.append("file", new File([csv], "targets.csv", { type: "text/csv" }));
    return fd;
  };

  it("re-imported suppressed email is created with do_not_email=true", async () => {
    (prismadb.crm_Targets.findMany as jest.Mock).mockResolvedValue([
      { email: "optedout@acme.com" },
    ]);

    await importTargets(
      makeFormData("email,last_name\noptedout@acme.com,Doe\nfresh@acme.com,Roe")
    );

    const rows = (prismadb.crm_Targets.createMany as jest.Mock).mock.calls[0][0].data;
    const optedOut = rows.find((r: any) => r.email === "optedout@acme.com");
    const fresh = rows.find((r: any) => r.email === "fresh@acme.com");
    expect(optedOut.do_not_email).toBe(true);
    expect(optedOut.do_not_email_at).toEqual(expect.any(Date));
    expect(fresh.do_not_email).toBeUndefined();
  });

  it("skips the suppression lookup when no rows have emails", async () => {
    await importTargets(makeFormData("last_name\nDoe"));
    expect(prismadb.crm_Targets.findMany).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 8: Run test to verify it fails**

Run: `pnpm test -- __tests__/actions/import-targets-suppression.test.ts`
Expected: FAIL — `do_not_email` is undefined on the opted-out row.

- [ ] **Step 9: Implement suppression inheritance in `import-targets.ts`**

Replace the final block

```ts
  if (valid.length > 0) {
    await prismadb.crm_Targets.createMany({ data: valid, skipDuplicates: true });
  }
```

with:

```ts
  if (valid.length > 0) {
    // Inherit global suppression: a re-imported address that previously
    // unsubscribed must never become emailable again via import.
    const emails = valid.map((v) => v.email).filter(Boolean) as string[];
    if (emails.length > 0) {
      const suppressed = await prismadb.crm_Targets.findMany({
        where: { do_not_email: true, email: { in: emails } },
        select: { email: true },
      });
      const suppressedEmails = new Set(suppressed.map((s) => s.email));
      for (const row of valid) {
        if (row.email && suppressedEmails.has(row.email)) {
          row.do_not_email = true;
          row.do_not_email_at = new Date();
        }
      }
    }
    await prismadb.crm_Targets.createMany({ data: valid, skipDuplicates: true });
  }
```

- [ ] **Step 10: Run the full campaign + action test suites and typecheck**

Run: `pnpm test -- __tests__/campaigns __tests__/actions actions/campaigns && pnpm exec tsc --noEmit`
Expected: all PASS, typecheck exit 0.

- [ ] **Step 11: Commit**

```bash
git add lib/campaigns/recipient-filters.ts inngest/functions/campaigns/send-now.ts inngest/functions/campaigns/schedule-send.ts inngest/functions/campaigns/process-follow-up.ts actions/crm/targets/import-targets.ts __tests__/campaigns/recipient-filters.test.ts __tests__/actions/import-targets-suppression.test.ts
git commit -m "feat(campaigns): enforce global do_not_email across send pipeline and import"
```

---

### Task 4: Target → Deal conversion

**Files:**
- Create: `actions/crm/targets/convert-target-to-deal.ts`
- Create: `app/[locale]/(routes)/campaigns/targets/[targetId]/components/ConvertToDealButton.tsx`
- Modify: `app/[locale]/(routes)/campaigns/targets/[targetId]/page.tsx` (render the button in the header actions area, next to the existing `EnrichButton`)
- Test: `actions/crm/targets/__tests__/convert-target-to-deal.test.ts` (new)

**Interfaces:**
- Consumes: `convertTarget(targetId): Promise<{ accountId; contactId } | { error }>` from `actions/crm/targets/convert-target.ts` (existing, unchanged); `writeAuditLog` from `@/lib/audit-log`; Inngest event `crm/opportunity.saved` (existing embedding trigger).
- Produces: `convertTargetToDeal(targetId: string): Promise<{ accountId: string; contactId: string; opportunityId: string } | { error: string }>`. Creates the opportunity at the **lowest-`order` sales stage** (the AQUNAMA runbook configures "Pre-Sale" as order 0) with campaign attribution from the target's most recent campaign send.

- [ ] **Step 1: Write the failing test**

Create `actions/crm/targets/__tests__/convert-target-to-deal.test.ts`:

```ts
jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Targets: { findFirst: jest.fn() },
    crm_campaign_sends: { findFirst: jest.fn() },
    crm_Opportunities_Sales_Stages: { findFirst: jest.fn() },
    crm_Opportunities: { create: jest.fn() },
  },
}));
jest.mock("@/inngest/client", () => ({
  inngest: { send: jest.fn().mockResolvedValue({}) },
}));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/actions/crm/targets/convert-target", () => ({
  convertTarget: jest.fn(),
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { convertTarget } from "@/actions/crm/targets/convert-target";
import { convertTargetToDeal } from "@/actions/crm/targets/convert-target-to-deal";

describe("convertTargetToDeal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSession as jest.Mock).mockResolvedValue({ user: { id: "u1" } });
  });

  it("unauthenticated returns Unauthorized", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    expect(await convertTargetToDeal("t1")).toEqual({ error: "Unauthorized" });
    expect(convertTarget).not.toHaveBeenCalled();
  });

  it("propagates conversion errors without creating an opportunity", async () => {
    (convertTarget as jest.Mock).mockResolvedValue({ error: "Target not found" });
    expect(await convertTargetToDeal("t1")).toEqual({ error: "Target not found" });
    expect(prismadb.crm_Opportunities.create).not.toHaveBeenCalled();
  });

  it("creates an opportunity at the entry stage with campaign attribution", async () => {
    (convertTarget as jest.Mock).mockResolvedValue({ accountId: "a1", contactId: "c1" });
    (prismadb.crm_Targets.findFirst as jest.Mock).mockResolvedValue({
      id: "t1",
      company: "Acme",
      last_name: "Doe",
    });
    (prismadb.crm_campaign_sends.findFirst as jest.Mock).mockResolvedValue({
      campaign_id: "camp-1",
    });
    (prismadb.crm_Opportunities_Sales_Stages.findFirst as jest.Mock).mockResolvedValue({
      id: "stage-presale",
    });
    (prismadb.crm_Opportunities.create as jest.Mock).mockResolvedValue({ id: "opp-1" });

    const res = await convertTargetToDeal("t1");

    expect(res).toEqual({ accountId: "a1", contactId: "c1", opportunityId: "opp-1" });
    const data = (prismadb.crm_Opportunities.create as jest.Mock).mock.calls[0][0].data;
    expect(data.account).toBe("a1");
    expect(data.contact).toBe("c1");
    expect(data.campaign).toBe("camp-1");
    expect(data.sales_stage).toBe("stage-presale");
    expect(data.assigned_to).toBe("u1");
    expect(data.status).toBe("ACTIVE");
  });

  it("works without any campaign send or configured stage", async () => {
    (convertTarget as jest.Mock).mockResolvedValue({ accountId: "a1", contactId: "c1" });
    (prismadb.crm_Targets.findFirst as jest.Mock).mockResolvedValue({
      id: "t1",
      company: null,
      last_name: "Doe",
    });
    (prismadb.crm_campaign_sends.findFirst as jest.Mock).mockResolvedValue(null);
    (prismadb.crm_Opportunities_Sales_Stages.findFirst as jest.Mock).mockResolvedValue(null);
    (prismadb.crm_Opportunities.create as jest.Mock).mockResolvedValue({ id: "opp-2" });

    const res = await convertTargetToDeal("t1");

    expect(res).toEqual({ accountId: "a1", contactId: "c1", opportunityId: "opp-2" });
    const data = (prismadb.crm_Opportunities.create as jest.Mock).mock.calls[0][0].data;
    expect(data.campaign).toBeUndefined();
    expect(data.sales_stage).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- actions/crm/targets/__tests__/convert-target-to-deal.test.ts`
Expected: FAIL — module `convert-target-to-deal` does not exist.

- [ ] **Step 3: Implement `actions/crm/targets/convert-target-to-deal.ts`**

```ts
"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { inngest } from "@/inngest/client";
import { writeAuditLog } from "@/lib/audit-log";
import { convertTarget } from "./convert-target";

export async function convertTargetToDeal(
  targetId: string
): Promise<
  { accountId: string; contactId: string; opportunityId: string } | { error: string }
> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };
  const userId = (session.user as any).id;

  const converted = await convertTarget(targetId);
  if ("error" in converted) return converted;

  const target = await prismadb.crm_Targets.findFirst({ where: { id: targetId } });
  if (!target) return { error: "Target not found" };

  // Campaign attribution: the campaign that last emailed this target, if any.
  const lastSend = await prismadb.crm_campaign_sends.findFirst({
    where: { target_id: targetId },
    orderBy: { sent_at: "desc" },
    select: { campaign_id: true },
  });

  // Entry stage = lowest order (the AQUNAMA runbook configures "Pre-Sale" as order 0).
  const entryStage = await prismadb.crm_Opportunities_Sales_Stages.findFirst({
    orderBy: { order: "asc" },
  });

  try {
    const opportunity = await prismadb.crm_Opportunities.create({
      data: {
        name: `${target.company || target.last_name} — inbound`,
        account: converted.accountId,
        contact: converted.contactId,
        campaign: lastSend?.campaign_id ?? undefined,
        sales_stage: entryStage?.id ?? undefined,
        assigned_to: userId,
        createdBy: userId,
        updatedBy: userId,
        last_activity_by: userId,
        last_activity: new Date(),
        status: "ACTIVE",
      },
    });

    await writeAuditLog({
      entityType: "opportunity",
      entityId: opportunity.id,
      action: "created",
      changes: null,
      userId,
    });
    void inngest.send({ name: "crm/opportunity.saved", data: { record_id: opportunity.id } });

    revalidatePath("/[locale]/(routes)/crm/opportunities", "page");
    revalidatePath("/[locale]/(routes)/campaigns/targets", "page");

    return { ...converted, opportunityId: opportunity.id };
  } catch (error) {
    console.error("[convertTargetToDeal] Error:", error);
    return { error: "Failed to create opportunity from target" };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- actions/crm/targets/__tests__/convert-target-to-deal.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Create the button component**

Create `app/[locale]/(routes)/campaigns/targets/[targetId]/components/ConvertToDealButton.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Handshake, Loader2 } from "lucide-react";
import { convertTargetToDeal } from "@/actions/crm/targets/convert-target-to-deal";

const ConvertToDealButton = ({ targetId }: { targetId: string }) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleConvert = async () => {
    setIsLoading(true);
    try {
      const res = await convertTargetToDeal(targetId);
      if ("error" in res) {
        toast.error(res.error);
      } else {
        toast.success("Target converted — deal created.");
        router.push(`/crm/opportunities/${res.opportunityId}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleConvert} disabled={isLoading}>
      {isLoading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Handshake className="h-4 w-4 mr-2" />
      )}
      Convert to deal
    </Button>
  );
};

export default ConvertToDealButton;
```

- [ ] **Step 6: Render the button on the target detail page**

In `app/[locale]/(routes)/campaigns/targets/[targetId]/page.tsx`, import the component and render `<ConvertToDealButton targetId={target.id} />` in the same header actions row where `EnrichButton` is rendered (immediately after it, matching its wrapper markup):

```tsx
import ConvertToDealButton from "./components/ConvertToDealButton";
// …in the header actions area, next to <EnrichButton …/>:
<ConvertToDealButton targetId={target.id} />
```

Use whatever prop the page passes to `EnrichButton` for the id (`target.id` or the `targetId` route param — match the page's existing variable).

- [ ] **Step 7: Typecheck and run the target action suite**

Run: `pnpm exec tsc --noEmit && pnpm test -- actions/crm/targets`
Expected: exit 0, all PASS.

- [ ] **Step 8: Commit**

```bash
git add actions/crm/targets/convert-target-to-deal.ts actions/crm/targets/__tests__/convert-target-to-deal.test.ts "app/[locale]/(routes)/campaigns/targets/[targetId]/components/ConvertToDealButton.tsx" "app/[locale]/(routes)/campaigns/targets/[targetId]/page.tsx"
git commit -m "feat(crm): convert target to deal with campaign attribution and entry stage"
```

---

### Task 5: `delivery_deadline` through actions and forms

**Files:**
- Modify: `actions/crm/opportunities/create-opportunity.ts`
- Modify: `actions/crm/opportunities/update-opportunity.ts`
- Modify: `app/[locale]/(routes)/crm/opportunities/components/NewOpportunityForm.tsx`
- Modify: `app/[locale]/(routes)/crm/opportunities/components/UpdateOpportunityForm.tsx`
- Test: `actions/crm/opportunities/__tests__/create-opportunity-delivery-deadline.test.ts` (new)

**Interfaces:**
- Consumes: `crm_Opportunities.delivery_deadline` from Task 1.
- Produces: `createOpportunity` and `updateOpportunity` accept optional `delivery_deadline?: Date` in their `data` parameter and persist it. Both opportunity forms expose an optional "Delivery deadline" date picker.

- [ ] **Step 1: Write the failing test**

Create `actions/crm/opportunities/__tests__/create-opportunity-delivery-deadline.test.ts`:

```ts
jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Opportunities: { create: jest.fn() },
    users: { findFirst: jest.fn() },
  },
}));
jest.mock("@/lib/sendmail", () => ({ __esModule: true, default: jest.fn() }));
jest.mock("@/inngest/client", () => ({
  inngest: { send: jest.fn().mockResolvedValue({}) },
}));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn() }));
jest.mock("@/lib/currency", () => ({
  getDefaultCurrency: jest.fn().mockResolvedValue("CZK"),
  getSnapshotRate: jest.fn().mockResolvedValue(null),
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { createOpportunity } from "@/actions/crm/opportunities/create-opportunity";

describe("createOpportunity delivery_deadline", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSession as jest.Mock).mockResolvedValue({ user: { id: "u1" } });
    (prismadb.crm_Opportunities.create as jest.Mock).mockResolvedValue({ id: "opp-1" });
  });

  it("persists delivery_deadline when provided", async () => {
    const deadline = new Date("2026-09-30");
    await createOpportunity({ name: "Deal", delivery_deadline: deadline });
    const data = (prismadb.crm_Opportunities.create as jest.Mock).mock.calls[0][0].data;
    expect(data.delivery_deadline).toEqual(deadline);
  });

  it("omits delivery_deadline when not provided", async () => {
    await createOpportunity({ name: "Deal" });
    const data = (prismadb.crm_Opportunities.create as jest.Mock).mock.calls[0][0].data;
    expect(data.delivery_deadline).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- actions/crm/opportunities/__tests__/create-opportunity-delivery-deadline.test.ts`
Expected: FAIL — TypeScript rejects `delivery_deadline` in the input type (or the field is dropped).

- [ ] **Step 3: Extend both actions**

In `actions/crm/opportunities/create-opportunity.ts`:
1. Add to the `data` parameter type, after `close_date?: Date;`:
   ```ts
   delivery_deadline?: Date;
   ```
2. Add `delivery_deadline,` to the destructuring block (after `close_date,`).
3. Add to the `prismadb.crm_Opportunities.create` data object (after `close_date,`):
   ```ts
   delivery_deadline,
   ```

Apply the same three edits to `actions/crm/opportunities/update-opportunity.ts` (same input-type addition, same destructure, same key in the `update` data object).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- actions/crm/opportunities/__tests__/create-opportunity-delivery-deadline.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Add the form field to both opportunity forms**

In `app/[locale]/(routes)/crm/opportunities/components/NewOpportunityForm.tsx`:
1. In the zod `formSchema`, after the `close_date` entry, add:
   ```ts
   delivery_deadline: z.date().optional(),
   ```
2. In the `form.reset({ … })` defaults, after `close_date: new Date(),`, add:
   ```ts
   delivery_deadline: undefined,
   ```
3. Immediately after the existing `close_date` `<FormField>` block, add a sibling field. Mirror the `close_date` block's Popover/Calendar internals **exactly as they appear in the file** — only the `name` and label differ:
   ```tsx
   <FormField
     control={form.control}
     name="delivery_deadline"
     render={({ field }) => (
       <FormItem className="flex flex-col">
         <FormLabel>Delivery deadline</FormLabel>
         {/* copy the <Popover>…</Popover> body of the close_date field verbatim */}
         <FormMessage />
       </FormItem>
     )}
   />
   ```
4. Ensure the submit handler passes the value through (if the handler spreads `data`/form values into the action call, nothing more is needed; if it lists fields explicitly, add `delivery_deadline: data.delivery_deadline,`).

Apply the same four edits to `UpdateOpportunityForm.tsx`, defaulting `delivery_deadline` from the loaded opportunity (`delivery_deadline: opportunity.delivery_deadline ?? undefined` — match how the form seeds `close_date`).

- [ ] **Step 6: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add actions/crm/opportunities "app/[locale]/(routes)/crm/opportunities/components/NewOpportunityForm.tsx" "app/[locale]/(routes)/crm/opportunities/components/UpdateOpportunityForm.tsx"
git commit -m "feat(crm): add delivery_deadline field to opportunities (PO-stage requirement)"
```

---

### Task 6: XLSX import

**Files:**
- Create: `lib/spreadsheet/parse.ts`
- Modify: `actions/crm/targets/import-targets.ts` (replace the Papa block, ~lines 19–23)
- Modify: `components/modals/ImportTargetsModal.tsx` (`handleFileChange` ~lines 93–108, `accept` attr ~line 226, copy at lines 201/207/213)
- Test: `__tests__/lib/parse-spreadsheet.test.ts` (new)

**Interfaces:**
- Consumes: nothing new.
- Produces: `parseSpreadsheetFile(file: File): Promise<Record<string, string>[]>` from `lib/spreadsheet/parse.ts` — first row of an `.xlsx` sheet (or CSV header row) becomes keys; empty rows dropped. Used server-side by `importTargets` and client-side by the modal. New dependency: `exceljs`.

- [ ] **Step 1: Add the dependency**

Run: `pnpm add exceljs`
Expected: `exceljs` appears in `package.json` dependencies.

- [ ] **Step 2: Write the failing test**

Create `__tests__/lib/parse-spreadsheet.test.ts`:

```ts
import ExcelJS from "exceljs";
import { parseSpreadsheetFile } from "@/lib/spreadsheet/parse";

describe("parseSpreadsheetFile", () => {
  it("parses CSV files via header row", async () => {
    const file = new File(
      ["email,last_name\njane@acme.com,Doe\n,\njohn@acme.com,Roe"],
      "targets.csv",
      { type: "text/csv" }
    );
    const rows = await parseSpreadsheetFile(file);
    expect(rows).toEqual([
      { email: "jane@acme.com", last_name: "Doe" },
      { email: "john@acme.com", last_name: "Roe" },
    ]);
  });

  it("parses XLSX files via first-row headers", async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Sheet1");
    ws.addRow(["email", "last_name"]);
    ws.addRow(["jane@acme.com", "Doe"]);
    ws.addRow([]); // empty row must be dropped
    ws.addRow(["john@acme.com", "Roe"]);
    const buffer = await wb.xlsx.writeBuffer();
    const file = new File([buffer], "targets.xlsx");

    const rows = await parseSpreadsheetFile(file);
    expect(rows).toEqual([
      { email: "jane@acme.com", last_name: "Doe" },
      { email: "john@acme.com", last_name: "Roe" },
    ]);
  });

  it("returns [] for an xlsx workbook with no worksheet", async () => {
    const wb = new ExcelJS.Workbook();
    const buffer = await wb.xlsx.writeBuffer();
    const file = new File([buffer], "empty.xlsx");
    expect(await parseSpreadsheetFile(file)).toEqual([]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test -- __tests__/lib/parse-spreadsheet.test.ts`
Expected: FAIL — module `lib/spreadsheet/parse` does not exist.

- [ ] **Step 4: Implement `lib/spreadsheet/parse.ts`**

```ts
import Papa from "papaparse";

// Parses a CSV or XLSX File into header-keyed string records.
// Works in both the server action and the browser (exceljs is
// loaded lazily so it never lands in the main client bundle).
export async function parseSpreadsheetFile(
  file: File
): Promise<Record<string, string>[]> {
  if (file.name.toLowerCase().endsWith(".xlsx")) {
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());
    const sheet = workbook.worksheets[0];
    if (!sheet) return [];

    const headers: string[] = [];
    sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => {
      headers[col - 1] = String(cell.value ?? "").trim();
    });

    const rows: Record<string, string>[] = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const record: Record<string, string> = {};
      let hasValue = false;
      headers.forEach((header, i) => {
        if (!header) return;
        const cell = row.getCell(i + 1);
        const value = cell.value == null ? "" : String(cell.text).trim();
        record[header] = value;
        if (value) hasValue = true;
      });
      if (hasValue) rows.push(record);
    });
    return rows;
  }

  const text = await file.text();
  const { data } = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });
  return data;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test -- __tests__/lib/parse-spreadsheet.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Use the parser in `import-targets.ts`**

Replace

```ts
  const text = await file.text();
  const { data } = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });
```

with

```ts
  const data = await parseSpreadsheetFile(file);
```

adding `import { parseSpreadsheetFile } from "@/lib/spreadsheet/parse";` and removing the now-unused `import Papa from "papaparse";`.

- [ ] **Step 7: Verify Task 3's import test still passes**

Run: `pnpm test -- __tests__/actions/import-targets-suppression.test.ts`
Expected: PASS (the CSV path now flows through the shared parser).

- [ ] **Step 8: Update the import modal**

In `components/modals/ImportTargetsModal.tsx`:

1. Add `import { parseSpreadsheetFile } from "@/lib/spreadsheet/parse";`.
2. Replace `handleFileChange` with:

```tsx
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    try {
      const rows = await parseSpreadsheetFile(file);
      const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
      setCsvHeaders(headers);
      setCsvRows(rows);
      fetchSuggestedMapping(headers);
    } catch {
      toast.error("Could not parse the selected file.");
    }
  };
```

3. Remove the now-unused `import Papa from "papaparse";`.
4. Change the file input's `accept=".csv"` to `accept=".csv,.xlsx"`.
5. Update user-facing copy: trigger button `Import CSV` → `Import CSV / Excel`; dialog title `Import Targets from CSV` → `Import Targets`; upload description `"Select a CSV file to import targets."` → `"Select a CSV or Excel (.xlsx) file to import targets."`; upload button `Select CSV file` → `Select file`.

- [ ] **Step 9: Typecheck and full test sweep**

Run: `pnpm exec tsc --noEmit && pnpm test`
Expected: exit 0, full suite PASS.

- [ ] **Step 10: Commit**

```bash
git add package.json pnpm-lock.yaml lib/spreadsheet/parse.ts actions/crm/targets/import-targets.ts components/modals/ImportTargetsModal.tsx __tests__/lib/parse-spreadsheet.test.ts
git commit -m "feat(crm): support XLSX target imports via shared spreadsheet parser"
```

---

### Task 7: Phase-0 setup runbook

**Files:**
- Create: `docs/internal/aqunama-setup-runbook.md`

**Interfaces:**
- Consumes: Task 4's entry-stage convention (lowest `order` = Pre-Sale).
- Produces: the manual-configuration checklist that makes the code from Tasks 1–6 operate as the AQUNAMA process.

- [ ] **Step 1: Write the runbook**

Create `docs/internal/aqunama-setup-runbook.md` with exactly this content:

```markdown
# AQUNAMA Phase-0 Setup Runbook (manual configuration, no code)

Perform these steps as an **admin** user after deploying Phase 1.

## 1. Sales stages (Admin → CRM settings → Sales stage)
Create in this order — the target→deal conversion enters deals at the
lowest-order stage, so Pre-Sale MUST have the lowest order:

| Order | Name           |
|-------|----------------|
| 0     | Pre-Sale       |
| 1     | Qualified Lead |
| 2     | Purchase Order |
| 3     | Delivery       |
| 4     | Care           |

Note: the admin UI edits stage names only; `order` is set at creation.

## 2. Lead statuses (optional, if inbound leads are triaged before targets)
Create: `New`, `In Sequence`, `Paused`, `Recycled`, `Unsubscribed`, `Lost`.

## 3. Target lists = batches
One list per import batch / AiLead campaign. Naming convention:
`[YYYY-MM] <campaign name> — <ICP>` (e.g. `[2026-07] Healthcare CallCenter — Hospitals CZ`).

## 4. Sequences = campaigns
Per AiLead campaign batch: create a campaign, attach the batch's target
list, add 4 email steps authored by the sales rep. Suggested delays
(delay_days): step 0 = 0, step 1 = 3, step 2 = 7, step 3 = 10.
Call touches are manual in v1 — the rep works from the campaign stats page.

## 5. AiLead tool access
Issue an MCP API token (profile → API tokens) for the AiLead generator.
It pushes leads with `crm_create_target` + `crm_create_target_list` and
assigns lists to campaigns with `campaigns_assign_target_list`.

## 6. Working the funnel
- Response received → open the target → **Convert to deal** (creates
  account + contact + opportunity at Pre-Sale with campaign attribution).
- PO won → move the deal to Purchase Order and fill **budget/expected
  revenue** and **delivery deadline** (both on the opportunity form).
- The 3-month recycle and 45-day kill rule are Phase 2 (automated);
  until then track them manually via the campaign stats and deal
  last-activity dates.
```

- [ ] **Step 2: Commit**

```bash
git add docs/internal/aqunama-setup-runbook.md
git commit -m "docs(internal): AQUNAMA phase-0 setup runbook"
```

---

## Out of Scope (later plans)

Covered by `docs/superpowers/plans/2026-07-16-aqunama-roadmap.md`: the timer/task engine (45-day kill rule, 3-month recycle, cadence and Care tasks), SOW/quote approval workflow, and full two-way calendar sync.
