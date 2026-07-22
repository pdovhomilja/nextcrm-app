# AQUNAMA Phase 3 — SOW/Quote Approval Workflow + Case-Study Flag Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce the spec's "CSO must approve every SOW/quote before it is sent" as a minimal approval workflow — request → manager/admin decision → hard server-side gate on entering the Qualified stage — plus the Care-funnel case-study candidate/approval flags on accounts.

**Architecture:** Approval state lives directly on `crm_Opportunities` (enum + audit fields; the SOW/quote itself is an attached Document — no quote entity, per the 2026-07-16 decision, upgradeable later). Two server actions (`requestApproval`, `decideApproval`) drive the flow with email notifications; a pure-ish gate helper called from `updateOpportunity` hard-blocks transitions into any stage whose `stage_kind` is `qualified` unless the deal is APPROVED — covering the form, the kanban drag, and any other path that routes through the action. The CSO works a dedicated `/crm/approvals` queue page (manager+admin gated, using the admin-layout guard pattern). Case-study is two booleans on accounts with a small card on the account detail page.

**Tech Stack:** Next.js 16 server actions, Prisma 7, existing authz helpers (`requireRole`, `isManagerOrAdmin` from `@/lib/authz`), resendHelper email pattern, Jest 30, shadcn/ui.

**Context docs:** `docs/superpowers/plans/2026-07-16-aqunama-roadmap.md` (Plan 3 stub), spec §3.5/§3.8 in `docs/internal/matej-sales-projecesses.md`.

**Decisions locked with the user (2026-07-19):** hard server-side block on Qualified entry; approvers = manager + admin roles; queue at `/crm/approvals` (CRM section, not admin).

**Documented scope choices:**
- The gate fires on stage TRANSITIONS through `updateOpportunity` only. Creating a deal directly in a qualified-kind stage is not blocked (the runbook flow always enters at Pre-Sale; conversion enters the lowest-order stage) — keeps the create forms and e2e specs untouched.
- Requesting approval does not require an attached document (the SOW may live outside the CRM); the request email reminds the rep to attach it.
- No approval history table — the latest decision lives on the deal (status/by/at/note) plus the audit log for the trail.

## Global Constraints

- Run tests with `./node_modules/.bin/jest <path>`; typecheck with `pnpm exec tsc --noEmit`. Suite is fully green — any failure you introduce is a regression. CI (4 blocking jobs incl. e2e) runs on push.
- **Migrations: do NOT run `prisma migrate dev` against the dev DB (known drift).** Author via `pnpm exec prisma migrate diff --from-schema-datamodel <git-show-of-old-schema> --to-schema-datamodel prisma/schema.prisma --script` into a timestamped migration folder, then verify by fresh-DB replay (disposable pgvector container) — the same procedure Phase 2 Task 1 used.
- Server actions: `"use server"`, `getSession()`/`requireRole` auth, `{ error: string }` returns. Approval decisions gated by `requireRole(["manager", "admin"])`.
- Emails from server actions use the resendHelper pattern (see `actions/crm/accounts/create-task.ts`): `import resendHelper from "@/lib/resend"; const resend = await resendHelper(); await resend.emails.send({ from: process.env.NEXT_PUBLIC_APP_NAME + " <" + process.env.EMAIL_FROM + ">", ... })` — always best-effort (try/catch, log, continue).
- Approval status values are the Prisma enum `crm_Approval_Status { NONE PENDING APPROVED REJECTED }`, default `NONE`.
- Audit every decision via `writeAuditLog` (`changes` is `AuditChange[]`: `{ field, old, new }`).
- Conventional commits on `dev`. Never stage: `AGENTS.md`, `lib/enrichment/e2b/agent-script.ts`, untracked docs, `.superpowers/`.

---

### Task 1: Schema — approval fields + case-study flags

**Files:**
- Modify: `prisma/schema.prisma` (model `crm_Opportunities` ~line 196, model `crm_Accounts` ~line 12, enums section near `crm_Opportunity_Status` ~line 250)

**Interfaces:**
- Produces (all later tasks depend on these exact names): enum `crm_Approval_Status` (`NONE | PENDING | APPROVED | REJECTED`); on `crm_Opportunities`: `approval_status crm_Approval_Status @default(NONE)`, `approval_requested_at DateTime?`, `approval_note String?`, `approved_by String? @db.Uuid`, `approved_at DateTime?`; on `crm_Accounts`: `case_study_candidate Boolean @default(false)`, `case_study_approved Boolean @default(false)`.

- [ ] **Step 1: Edit the schema**

Add next to the other enums:

```prisma
enum crm_Approval_Status {
  NONE
  PENDING
  APPROVED
  REJECTED
}
```

In `model crm_Opportunities`, after `stage_entered_at DateTime?` add:

```prisma
  /// SOW/quote approval (spec §3.5: CSO approves before the quote is sent).
  approval_status       crm_Approval_Status @default(NONE)
  approval_requested_at DateTime?
  approval_note         String?
  approved_by           String?             @db.Uuid
  approved_at           DateTime?
```

In `model crm_Accounts`, after the `status` field add:

```prisma
  /// Spec §3.8 case-study pipeline: rep flags the candidate, CSO approves.
  case_study_candidate Boolean @default(false)
  case_study_approved  Boolean @default(false)
```

- [ ] **Step 2: Author the migration WITHOUT migrate dev**

```bash
git show HEAD:prisma/schema.prisma > /tmp/schema-before.prisma
mkdir -p "prisma/migrations/$(date -u +%Y%m%d%H%M%S)_aqunama_p3_approval_and_case_study"
pnpm exec prisma migrate diff \
  --from-schema-datamodel /tmp/schema-before.prisma \
  --to-schema-datamodel prisma/schema.prisma \
  --script > "prisma/migrations/<the-folder-you-created>/migration.sql"
pnpm exec prisma generate
```

Inspect the SQL: it must contain ONLY the new enum type, five `ALTER TABLE "crm_Opportunities" ADD COLUMN`, and two `ALTER TABLE "crm_Accounts" ADD COLUMN` — nothing else. If anything else appears, stop and report BLOCKED.

- [ ] **Step 3: Verify by fresh-DB replay**

```bash
docker run -d --name p3seed -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=p3 -p 55432:5432 pgvector/pgvector:pg16
for i in $(seq 1 20); do docker exec p3seed pg_isready -U postgres -q && break; sleep 1; done
DATABASE_URL=postgresql://postgres:postgres@localhost:55432/p3 pnpm exec prisma migrate deploy
SEED_DEMO_DATA=1 DATABASE_URL=postgresql://postgres:postgres@localhost:55432/p3 pnpm exec prisma db seed
docker rm -f p3seed
```

Expected: all migrations incl. the new one apply; seed completes.

- [ ] **Step 4: Typecheck + suite, commit**

Run: `pnpm exec tsc --noEmit && ./node_modules/.bin/jest --ci --testPathIgnorePatterns "__tests__/invoices/lifecycle"`
Expected: clean / all pass.

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(crm): approval-status fields on opportunities, case-study flags on accounts"
```

---

### Task 2: Approval actions — request + decide

**Files:**
- Create: `actions/crm/opportunities/approval.ts`
- Test: `actions/crm/opportunities/__tests__/approval.test.ts`

**Interfaces:**
- Consumes: Task 1 fields; `requireAuthenticated`/`requireRole` from `@/lib/authz`; `writeAuditLog` from `@/lib/audit-log`; `resendHelper` from `@/lib/resend`.
- Produces:
  - `requestApproval(opportunityId: string): Promise<{ error?: string }>` — any authenticated user; deal must exist, not be deleted, and not already be PENDING or APPROVED; sets `approval_status: "PENDING"`, `approval_requested_at: new Date()`, clears `approval_note`; emails all ACTIVE manager/admin users a link to `/crm/approvals`; audit-logs.
  - `decideApproval(opportunityId: string, decision: "APPROVED" | "REJECTED", note?: string): Promise<{ error?: string }>` — `requireRole(["manager", "admin"])`; deal must be PENDING; sets status, `approved_by`, `approved_at`, `approval_note` (note trimmed, max 1000, stored for rejections and approvals alike); emails the deal's assigned rep; audit-logs.

- [ ] **Step 1: Write the failing tests**

Create `actions/crm/opportunities/__tests__/approval.test.ts`:

```ts
jest.mock("@/lib/authz", () => ({
  requireAuthenticated: jest.fn(),
  requireRole: jest.fn(),
  AuthenticationError: class AuthenticationError extends Error {},
  AuthorizationError: class AuthorizationError extends Error {},
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Opportunities: { findFirst: jest.fn(), update: jest.fn() },
    users: { findMany: jest.fn(), findUnique: jest.fn() },
  },
}));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
const mockEmailSend = jest.fn().mockResolvedValue({});
jest.mock("@/lib/resend", () => ({
  __esModule: true,
  default: jest.fn(async () => ({ emails: { send: mockEmailSend } })),
}));

import { prismadb } from "@/lib/prisma";
import { requireAuthenticated, requireRole } from "@/lib/authz";
import { requestApproval, decideApproval } from "@/actions/crm/opportunities/approval";

describe("requestApproval", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireAuthenticated as jest.Mock).mockResolvedValue({ id: "rep1", role: "user" });
    (prismadb.crm_Opportunities.findFirst as jest.Mock).mockResolvedValue({
      id: "o1", name: "Deal", approval_status: "NONE", assigned_to: "rep1",
    });
    (prismadb.crm_Opportunities.update as jest.Mock).mockResolvedValue({ id: "o1" });
    (prismadb.users.findMany as jest.Mock).mockResolvedValue([
      { email: "cso@x.cz" },
    ]);
  });

  it("moves NONE -> PENDING, stamps requested_at, notifies approvers", async () => {
    const res = await requestApproval("o1");
    expect(res).toEqual({});
    const call = (prismadb.crm_Opportunities.update as jest.Mock).mock.calls[0][0];
    expect(call.where).toEqual({ id: "o1" });
    expect(call.data.approval_status).toBe("PENDING");
    expect(call.data.approval_requested_at).toEqual(expect.any(Date));
    expect(call.data.approval_note).toBeNull();
    expect(mockEmailSend).toHaveBeenCalled();
  });

  it("rejects when already PENDING", async () => {
    (prismadb.crm_Opportunities.findFirst as jest.Mock).mockResolvedValue({
      id: "o1", approval_status: "PENDING",
    });
    const res = await requestApproval("o1");
    expect(res.error).toBeDefined();
    expect(prismadb.crm_Opportunities.update).not.toHaveBeenCalled();
  });

  it("rejects when already APPROVED", async () => {
    (prismadb.crm_Opportunities.findFirst as jest.Mock).mockResolvedValue({
      id: "o1", approval_status: "APPROVED",
    });
    const res = await requestApproval("o1");
    expect(res.error).toBeDefined();
  });

  it("allows re-request after REJECTED", async () => {
    (prismadb.crm_Opportunities.findFirst as jest.Mock).mockResolvedValue({
      id: "o1", approval_status: "REJECTED", assigned_to: "rep1",
    });
    const res = await requestApproval("o1");
    expect(res).toEqual({});
  });
});

describe("decideApproval", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireRole as jest.Mock).mockResolvedValue({ id: "cso1", role: "manager" });
    (prismadb.crm_Opportunities.findFirst as jest.Mock).mockResolvedValue({
      id: "o1", name: "Deal", approval_status: "PENDING", assigned_to: "rep1",
    });
    (prismadb.crm_Opportunities.update as jest.Mock).mockResolvedValue({ id: "o1" });
    (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id: "rep1", email: "rep@x.cz" });
  });

  it("approves: sets status/by/at and notifies the rep", async () => {
    const res = await decideApproval("o1", "APPROVED");
    expect(res).toEqual({});
    const data = (prismadb.crm_Opportunities.update as jest.Mock).mock.calls[0][0].data;
    expect(data.approval_status).toBe("APPROVED");
    expect(data.approved_by).toBe("cso1");
    expect(data.approved_at).toEqual(expect.any(Date));
    expect(mockEmailSend).toHaveBeenCalled();
  });

  it("rejects with a note", async () => {
    await decideApproval("o1", "REJECTED", "  Missing pricing table  ");
    const data = (prismadb.crm_Opportunities.update as jest.Mock).mock.calls[0][0].data;
    expect(data.approval_status).toBe("REJECTED");
    expect(data.approval_note).toBe("Missing pricing table");
  });

  it("errors when the deal is not PENDING", async () => {
    (prismadb.crm_Opportunities.findFirst as jest.Mock).mockResolvedValue({
      id: "o1", approval_status: "NONE",
    });
    const res = await decideApproval("o1", "APPROVED");
    expect(res.error).toBeDefined();
    expect(prismadb.crm_Opportunities.update).not.toHaveBeenCalled();
  });

  it("returns error for non-managers", async () => {
    const { AuthorizationError } = jest.requireMock("@/lib/authz");
    (requireRole as jest.Mock).mockRejectedValue(new AuthorizationError());
    const res = await decideApproval("o1", "APPROVED");
    expect(res.error).toBeDefined();
  });
});
```

- [ ] **Step 2: Run to verify failure** — `./node_modules/.bin/jest actions/crm/opportunities/__tests__/approval.test.ts` → FAIL (module not found).

- [ ] **Step 3: Implement `actions/crm/opportunities/approval.ts`**

```ts
"use server";

import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import resendHelper from "@/lib/resend";
import { writeAuditLog } from "@/lib/audit-log";
import {
  requireAuthenticated,
  requireRole,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL ?? "";
const FROM = () =>
  `${process.env.NEXT_PUBLIC_APP_NAME} <${process.env.EMAIL_FROM}>`;

async function notify(to: string[], subject: string, text: string) {
  if (to.length === 0) return;
  try {
    const resend = await resendHelper();
    await resend.emails.send({ from: FROM(), to, subject, text });
  } catch (error) {
    console.error("[approval] notification failed:", error);
  }
}

// Spec §3.5: rep submits the SOW/quote for CSO approval before it goes out.
export async function requestApproval(
  opportunityId: string,
): Promise<{ error?: string }> {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    throw e;
  }

  const deal = await prismadb.crm_Opportunities.findFirst({
    where: { id: opportunityId, deletedAt: null },
  });
  if (!deal) return { error: "Opportunity not found" };
  if (deal.approval_status === "PENDING")
    return { error: "Approval is already pending for this deal." };
  if (deal.approval_status === "APPROVED")
    return { error: "This deal is already approved." };

  await prismadb.crm_Opportunities.update({
    where: { id: opportunityId },
    data: {
      approval_status: "PENDING",
      approval_requested_at: new Date(),
      approval_note: null,
      updatedBy: user.id,
    },
  });
  await writeAuditLog({
    entityType: "opportunity",
    entityId: opportunityId,
    action: "updated",
    changes: [
      { field: "approval_status", old: deal.approval_status, new: "PENDING" },
    ],
    userId: user.id,
  });

  const approvers = await prismadb.users.findMany({
    where: { role: { in: ["manager", "admin"] }, userStatus: "ACTIVE" },
    select: { email: true },
  });
  await notify(
    approvers.map((a) => a.email).filter(Boolean) as string[],
    `Approval requested: ${deal.name ?? opportunityId}`,
    `A quote/SOW approval was requested for "${deal.name ?? opportunityId}".\n` +
      `Review the queue: ${APP_URL()}/crm/approvals\n` +
      `Deal: ${APP_URL()}/crm/opportunities/${opportunityId}\n` +
      `(The SOW/quote should be attached to the deal's documents.)`,
  );

  revalidatePath("/[locale]/(routes)/crm/opportunities", "page");
  return {};
}

// CSO decision — managers and admins only (2026-07-19 decision).
export async function decideApproval(
  opportunityId: string,
  decision: "APPROVED" | "REJECTED",
  note?: string,
): Promise<{ error?: string }> {
  let approver;
  try {
    approver = await requireRole(["manager", "admin"]);
  } catch (e) {
    if (e instanceof AuthenticationError || e instanceof AuthorizationError) {
      return { error: "Forbidden" };
    }
    throw e;
  }
  if (decision !== "APPROVED" && decision !== "REJECTED")
    return { error: "Invalid decision" };

  const deal = await prismadb.crm_Opportunities.findFirst({
    where: { id: opportunityId, deletedAt: null },
  });
  if (!deal) return { error: "Opportunity not found" };
  if (deal.approval_status !== "PENDING")
    return { error: "This deal has no pending approval request." };

  const trimmedNote = note?.trim().slice(0, 1000) || null;
  await prismadb.crm_Opportunities.update({
    where: { id: opportunityId },
    data: {
      approval_status: decision,
      approved_by: approver.id,
      approved_at: new Date(),
      approval_note: trimmedNote,
      updatedBy: approver.id,
    },
  });
  await writeAuditLog({
    entityType: "opportunity",
    entityId: opportunityId,
    action: "updated",
    changes: [
      { field: "approval_status", old: "PENDING", new: decision },
      ...(trimmedNote ? [{ field: "approval_note", old: null, new: trimmedNote }] : []),
    ],
    userId: approver.id,
  });

  if (deal.assigned_to) {
    const rep = await prismadb.users.findUnique({ where: { id: deal.assigned_to } });
    if (rep?.email) {
      await notify(
        [rep.email],
        `Quote ${decision === "APPROVED" ? "approved" : "rejected"}: ${deal.name ?? opportunityId}`,
        `Your quote/SOW for "${deal.name ?? opportunityId}" was ${decision.toLowerCase()}.` +
          (trimmedNote ? `\nNote: ${trimmedNote}` : "") +
          `\nDeal: ${APP_URL()}/crm/opportunities/${opportunityId}`,
      );
    }
  }

  revalidatePath("/[locale]/(routes)/crm/opportunities", "page");
  return {};
}
```

- [ ] **Step 4: Run to verify pass** — same jest command → PASS (9 tests).

- [ ] **Step 5: Typecheck + suite, commit**

```bash
git add actions/crm/opportunities/approval.ts actions/crm/opportunities/__tests__/approval.test.ts
git commit -m "feat(crm): quote approval request/decide actions with notifications"
```

---

### Task 3: Hard gate — Qualified entry requires approval

**Files:**
- Create: `lib/crm/approval-gate.ts`
- Modify: `actions/crm/opportunities/update-opportunity.ts` (before the prisma update, after `before` is fetched)
- Test: `__tests__/crm/approval-gate.test.ts`

**Interfaces:**
- Consumes: `stage_kind` on sales stages; `approval_status` (Task 1).
- Produces: `qualifiedEntryBlockReason(opts: { fromStage: string | null; toStage: string | null; approvalStatus: string }): Promise<string | null>` — returns an error message when the transition enters a `qualified`-kind stage without `approvalStatus === "APPROVED"`, else null. No-op (null) when stage unchanged, toStage null, or target stage has another/no kind.

- [ ] **Step 1: Write the failing tests**

Create `__tests__/crm/approval-gate.test.ts`:

```ts
jest.mock("@/lib/prisma", () => ({
  prismadb: { crm_Opportunities_Sales_Stages: { findUnique: jest.fn() } },
}));

import { prismadb } from "@/lib/prisma";
import { qualifiedEntryBlockReason } from "@/lib/crm/approval-gate";

const stage = prismadb.crm_Opportunities_Sales_Stages.findUnique as jest.Mock;

describe("qualifiedEntryBlockReason", () => {
  beforeEach(() => jest.clearAllMocks());

  it("blocks entering a qualified stage without approval", async () => {
    stage.mockResolvedValue({ stage_kind: "qualified" });
    const reason = await qualifiedEntryBlockReason({
      fromStage: "s-presale", toStage: "s-qualified", approvalStatus: "NONE",
    });
    expect(reason).toContain("approval");
  });

  it("allows entering a qualified stage when APPROVED", async () => {
    stage.mockResolvedValue({ stage_kind: "qualified" });
    expect(
      await qualifiedEntryBlockReason({
        fromStage: "s-presale", toStage: "s-qualified", approvalStatus: "APPROVED",
      }),
    ).toBeNull();
  });

  it("ignores non-qualified target stages", async () => {
    stage.mockResolvedValue({ stage_kind: "care" });
    expect(
      await qualifiedEntryBlockReason({
        fromStage: "a", toStage: "b", approvalStatus: "NONE",
      }),
    ).toBeNull();
  });

  it("no-ops when the stage is unchanged (already inside)", async () => {
    expect(
      await qualifiedEntryBlockReason({
        fromStage: "s-qualified", toStage: "s-qualified", approvalStatus: "NONE",
      }),
    ).toBeNull();
    expect(stage).not.toHaveBeenCalled();
  });

  it("no-ops when toStage is null", async () => {
    expect(
      await qualifiedEntryBlockReason({
        fromStage: "a", toStage: null, approvalStatus: "NONE",
      }),
    ).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure** — module not found.

- [ ] **Step 3: Implement `lib/crm/approval-gate.ts`**

```ts
import { prismadb } from "@/lib/prisma";

// Spec §3.5 hard gate (2026-07-19 decision): a deal may only ENTER a stage
// whose stage_kind is "qualified" (quote sent) when its SOW/quote is
// APPROVED. Transitions elsewhere, staying in place, and clearing the
// stage are unaffected.
export async function qualifiedEntryBlockReason(opts: {
  fromStage: string | null;
  toStage: string | null;
  approvalStatus: string;
}): Promise<string | null> {
  const { fromStage, toStage, approvalStatus } = opts;
  if (!toStage || toStage === fromStage) return null;
  if (approvalStatus === "APPROVED") return null;

  const target = await prismadb.crm_Opportunities_Sales_Stages.findUnique({
    where: { id: toStage },
    select: { stage_kind: true },
  });
  if (target?.stage_kind !== "qualified") return null;

  return "Quote approval is required before moving this deal to the Qualified stage. Request approval from the deal page first.";
}
```

- [ ] **Step 4: Run to verify pass** — 5 tests PASS.

- [ ] **Step 5: Wire into `update-opportunity.ts`**

Add `import { qualifiedEntryBlockReason } from "@/lib/crm/approval-gate";` and, inside the try block after `const before = await prismadb.crm_Opportunities.findUnique(...)` and BEFORE the `prismadb.crm_Opportunities.update(...)` call, insert:

```ts
    const blockReason = await qualifiedEntryBlockReason({
      fromStage: before?.sales_stage ?? null,
      toStage: sales_stage || null,
      approvalStatus: before?.approval_status ?? "NONE",
    });
    if (blockReason) return { error: blockReason };
```

- [ ] **Step 6: Extend the action's tests**

Add to `actions/crm/opportunities/__tests__/update-opportunity-currency.test.ts` (whose mocks already cover this action — add `crm_Opportunities_Sales_Stages: { findUnique: jest.fn() }` to its prisma mock and set `findUnique` for `crm_Opportunities` to return `{ id: "opp-1", sales_stage: "s-old", approval_status: "NONE" }` in beforeEach):

```ts
  it("blocks moving an unapproved deal into a qualified-kind stage", async () => {
    (prismadb.crm_Opportunities_Sales_Stages.findUnique as jest.Mock).mockResolvedValue({
      stage_kind: "qualified",
    });
    const res = await updateOpportunity({
      id: "opp-1", name: "Deal", sales_stage: "s-qualified",
    } as any);
    expect(res.error).toContain("approval");
    expect(prismadb.crm_Opportunities.update).not.toHaveBeenCalled();
  });

  it("allows the move when the deal is APPROVED", async () => {
    (prismadb.crm_Opportunities.findUnique as jest.Mock).mockResolvedValue({
      id: "opp-1", sales_stage: "s-old", approval_status: "APPROVED",
    });
    (prismadb.crm_Opportunities_Sales_Stages.findUnique as jest.Mock).mockResolvedValue({
      stage_kind: "qualified",
    });
    const res = await updateOpportunity({
      id: "opp-1", name: "Deal", sales_stage: "s-qualified",
    } as any);
    expect(res.error).toBeUndefined();
  });
```

Caution: this action also calls `handleStageTransition` (which uses `crm_Opportunities.update` and `inngest.send` — already mocked there) — verify the existing currency tests still pass unchanged.

- [ ] **Step 7: Full suite + typecheck, commit**

Note the e2e implication: the CI e2e suite moves deals between stages via kanban/forms — the seeded qualified stage ("Need analysis") now requires approval. Check `tests/e2e/sales-flow.spec.ts` and the kanban specs for transitions INTO the qualified stage; if any exist, extend the spec to run `requestApproval`+`decideApproval`… no — simpler: the e2e specs create deals via the form directly in a chosen stage (creation is ungated) and update names, not stages. Verify by grep (`grep -rn "Sale stage\|sales_stage\|drag" tests/e2e/`) and run any affected spec locally if the dev DB is reachable. Report findings.

```bash
git add lib/crm/approval-gate.ts __tests__/crm/approval-gate.test.ts actions/crm/opportunities/update-opportunity.ts actions/crm/opportunities/__tests__/update-opportunity-currency.test.ts
git commit -m "feat(crm): hard-block unapproved deals from entering the qualified stage"
```

---

### Task 4: Approvals queue page + deal-page approval UI

**Files:**
- Create: `app/[locale]/(routes)/crm/approvals/page.tsx`
- Create: `app/[locale]/(routes)/crm/approvals/components/ApprovalsTable.tsx`
- Create: `actions/crm/opportunities/get-pending-approvals.ts`
- Create: `app/[locale]/(routes)/crm/opportunities/[opportunityId]/components/RequestApprovalButton.tsx`
- Modify: `app/[locale]/(routes)/crm/opportunities/[opportunityId]/components/BasicView.tsx` (approval-status badge in the CardHeader + render RequestApprovalButton next to `OpportunityDetailActions`)
- Modify: `app/[locale]/(routes)/components/menu-items/Crm.tsx` + `app/[locale]/(routes)/components/app-sidebar.tsx` (role-aware "Approvals" sub-item)
- Test: `actions/crm/opportunities/__tests__/get-pending-approvals.test.ts`

**Interfaces:**
- Consumes: `decideApproval`/`requestApproval` (Task 2).
- Produces: `getPendingApprovals(): Promise<PendingApproval[] | { error: string }>` where `PendingApproval = { id: string; name: string | null; accountName: string | null; repName: string | null; budget: number; expected_revenue: number; approval_requested_at: Date | null }` — `requireRole(["manager","admin"])`-gated, PENDING deals ordered by `approval_requested_at` asc, Decimals serialized (reuse `serializeDecimalsList`).

- [ ] **Step 1: Write the failing test**

Create `actions/crm/opportunities/__tests__/get-pending-approvals.test.ts`:

```ts
jest.mock("@/lib/authz", () => ({
  requireRole: jest.fn(),
  AuthenticationError: class AuthenticationError extends Error {},
  AuthorizationError: class AuthorizationError extends Error {},
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: { crm_Opportunities: { findMany: jest.fn() } },
}));

import { prismadb } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { getPendingApprovals } from "@/actions/crm/opportunities/get-pending-approvals";

describe("getPendingApprovals", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireRole as jest.Mock).mockResolvedValue({ id: "cso1", role: "manager" });
  });

  it("lists PENDING deals with serialized decimals, oldest request first", async () => {
    (prismadb.crm_Opportunities.findMany as jest.Mock).mockResolvedValue([
      {
        id: "o1", name: "Deal", approval_requested_at: new Date("2026-07-01"),
        budget: { toNumber: () => 1000 }, expected_revenue: { toNumber: () => 800 },
        assigned_account: { name: "Acme" }, assigned_to_user: { name: "Rep" },
      },
    ]);
    const res = await getPendingApprovals();
    expect(Array.isArray(res)).toBe(true);
    const rows = res as any[];
    expect(rows[0]).toMatchObject({
      id: "o1", accountName: "Acme", repName: "Rep", budget: 1000,
    });
    const where = (prismadb.crm_Opportunities.findMany as jest.Mock).mock.calls[0][0].where;
    expect(where.approval_status).toBe("PENDING");
    expect(where.deletedAt).toBeNull();
  });

  it("returns error for non-managers", async () => {
    const { AuthorizationError } = jest.requireMock("@/lib/authz");
    (requireRole as jest.Mock).mockRejectedValue(new AuthorizationError());
    const res = await getPendingApprovals();
    expect((res as any).error).toBeDefined();
  });
});
```

- [ ] **Step 2: RED** — module not found.

- [ ] **Step 3: Implement `get-pending-approvals.ts`**

```ts
"use server";

import { prismadb } from "@/lib/prisma";
import { serializeDecimalsList } from "@/lib/serialize-decimals";
import {
  requireRole,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export type PendingApproval = {
  id: string;
  name: string | null;
  accountName: string | null;
  repName: string | null;
  budget: number;
  expected_revenue: number;
  approval_requested_at: Date | null;
};

export async function getPendingApprovals(): Promise<
  PendingApproval[] | { error: string }
> {
  try {
    await requireRole(["manager", "admin"]);
  } catch (e) {
    if (e instanceof AuthenticationError || e instanceof AuthorizationError) {
      return { error: "Forbidden" };
    }
    throw e;
  }

  const rows = await prismadb.crm_Opportunities.findMany({
    where: { approval_status: "PENDING", deletedAt: null },
    include: {
      assigned_account: { select: { name: true } },
      assigned_to_user: { select: { name: true } },
    },
    orderBy: { approval_requested_at: "asc" },
  });

  return serializeDecimalsList(rows).map((r: any) => ({
    id: r.id,
    name: r.name ?? null,
    accountName: r.assigned_account?.name ?? null,
    repName: r.assigned_to_user?.name ?? null,
    budget: r.budget ?? 0,
    expected_revenue: r.expected_revenue ?? 0,
    approval_requested_at: r.approval_requested_at ?? null,
  }));
}
```

- [ ] **Step 4: GREEN** — 2 tests pass.

- [ ] **Step 5: Build the page + table + deal-page UI**

`app/[locale]/(routes)/crm/approvals/page.tsx` (server; gate with the admin-layout pattern but for manager+admin):

```tsx
import { redirect } from "next/navigation";
import Container from "../../components/ui/Container";
import { requireRole, AuthenticationError, AuthorizationError } from "@/lib/authz";
import { getPendingApprovals } from "@/actions/crm/opportunities/get-pending-approvals";
import ApprovalsTable from "./components/ApprovalsTable";

const ApprovalsPage = async () => {
  try {
    await requireRole(["manager", "admin"]);
  } catch (e) {
    if (e instanceof AuthenticationError) redirect("/sign-in");
    if (e instanceof AuthorizationError) redirect("/");
    throw e;
  }
  const pending = await getPendingApprovals();
  const rows = Array.isArray(pending) ? pending : [];
  return (
    <Container
      title="Quote approvals"
      description="Deals waiting for a quote/SOW decision"
    >
      <ApprovalsTable rows={rows} />
    </Container>
  );
};

export default ApprovalsPage;
```

`components/ApprovalsTable.tsx` (client): a simple table (follow the Card+table look of `DocumentsView`) with columns Deal (link to `/crm/opportunities/[id]`), Account, Rep, Budget, Requested; per row an **Approve** button (calls `decideApproval(id, "APPROVED")`, success toast, `router.refresh()`) and a **Reject** button opening a small `Dialog` with a `Textarea` for the note, submitting `decideApproval(id, "REJECTED", note)`. Empty state: "No deals waiting for approval." All action results checked for `.error` → error toast.

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { decideApproval } from "@/actions/crm/opportunities/approval";
import type { PendingApproval } from "@/actions/crm/opportunities/get-pending-approvals";

const ApprovalsTable = ({ rows }: { rows: PendingApproval[] }) => {
  const router = useRouter();
  const [rejecting, setRejecting] = useState<PendingApproval | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const decide = async (id: string, decision: "APPROVED" | "REJECTED", n?: string) => {
    setBusy(true);
    try {
      const res = await decideApproval(id, decision, n);
      if (res.error) toast.error(res.error);
      else {
        toast.success(decision === "APPROVED" ? "Quote approved" : "Quote rejected");
        setRejecting(null);
        setNote("");
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No deals waiting for approval.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="px-4 py-3">Deal</th>
              <th className="px-4 py-3">Account</th>
              <th className="px-4 py-3">Rep</th>
              <th className="px-4 py-3">Budget</th>
              <th className="px-4 py-3">Requested</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="px-4 py-3">
                  <Link className="font-medium hover:underline" href={`/crm/opportunities/${r.id}`}>
                    {r.name ?? r.id}
                  </Link>
                </td>
                <td className="px-4 py-3">{r.accountName ?? "—"}</td>
                <td className="px-4 py-3">{r.repName ?? "—"}</td>
                <td className="px-4 py-3">{r.budget.toLocaleString()}</td>
                <td className="px-4 py-3">
                  {r.approval_requested_at
                    ? new Date(r.approval_requested_at).toLocaleDateString()
                    : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" disabled={busy} onClick={() => decide(r.id, "APPROVED")}>
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => setRejecting(r)}>
                      Reject
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>

      <Dialog open={!!rejecting} onOpenChange={(v) => { if (!v) setRejecting(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject quote — {rejecting?.name ?? ""}</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="What needs to change? (sent to the rep)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={1000}
          />
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => rejecting && decide(rejecting.id, "REJECTED", note)}
            >
              Reject quote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ApprovalsTable;
```

`RequestApprovalButton.tsx` (client):

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FileCheck2, Loader2 } from "lucide-react";
import { requestApproval } from "@/actions/crm/opportunities/approval";

const RequestApprovalButton = ({ opportunityId }: { opportunityId: string }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      const res = await requestApproval(opportunityId);
      if (res.error) toast.error(res.error);
      else {
        toast.success("Approval requested — approvers were notified.");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={submit} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileCheck2 className="h-4 w-4 mr-2" />}
      Request approval
    </Button>
  );
};

export default RequestApprovalButton;
```

In the opportunity `BasicView.tsx` CardHeader: read the file first, then (a) next to the title render a status `Badge` — `NONE` → no badge; `PENDING` → `<Badge variant="secondary">Approval pending</Badge>`; `APPROVED` → `<Badge>Approved</Badge>`; `REJECTED` → `<Badge variant="destructive">Rejected</Badge>` (title attribute = `approval_note` when set); (b) render `<RequestApprovalButton opportunityId={...} />` beside `<OpportunityDetailActions …/>` only when `approval_status` is `NONE` or `REJECTED`.

Navigation: read `menu-items/Crm.tsx` and `app-sidebar.tsx`; give `getCrmMenuItem` an optional `role?: string` parameter and append `{ title: "Approvals", url: "/crm/approvals" }` to its `items` only when `role === "manager" || role === "admin"`; in `app-sidebar.tsx` pass `session?.user?.role` at the existing call site.

- [ ] **Step 6: Typecheck + full suite, commit**

```bash
git add "app/[locale]/(routes)/crm/approvals" actions/crm/opportunities/get-pending-approvals.ts actions/crm/opportunities/__tests__/get-pending-approvals.test.ts "app/[locale]/(routes)/crm/opportunities/[opportunityId]/components" "app/[locale]/(routes)/components/menu-items/Crm.tsx" "app/[locale]/(routes)/components/app-sidebar.tsx"
git commit -m "feat(crm): approvals queue page and deal-page approval UI"
```

---

### Task 5: Case-study flag on accounts

**Files:**
- Create: `actions/crm/accounts/case-study.ts`
- Create: `app/[locale]/(routes)/crm/accounts/[accountId]/components/CaseStudyCard.tsx`
- Modify: `app/[locale]/(routes)/crm/accounts/[accountId]/page.tsx` (render the card right after `<BasicView data={account} />`)
- Test: `actions/crm/accounts/__tests__/case-study.test.ts`

**Interfaces:**
- Consumes: Task 1's account booleans; `requireAuthenticated`/`requireRole`.
- Produces: `setCaseStudyCandidate(accountId: string, candidate: boolean): Promise<{ error?: string }>` (any authenticated user; setting `false` also clears `case_study_approved`); `setCaseStudyApproved(accountId: string, approved: boolean): Promise<{ error?: string }>` (`requireRole(["manager","admin"])`; requires `case_study_candidate` true to approve). Both audit-logged.

- [ ] **Step 1: Write the failing tests**

Create `actions/crm/accounts/__tests__/case-study.test.ts`:

```ts
jest.mock("@/lib/authz", () => ({
  requireAuthenticated: jest.fn(),
  requireRole: jest.fn(),
  AuthenticationError: class AuthenticationError extends Error {},
  AuthorizationError: class AuthorizationError extends Error {},
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: { crm_Accounts: { findFirst: jest.fn(), update: jest.fn() } },
}));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

import { prismadb } from "@/lib/prisma";
import { requireAuthenticated, requireRole } from "@/lib/authz";
import {
  setCaseStudyCandidate,
  setCaseStudyApproved,
} from "@/actions/crm/accounts/case-study";

describe("case-study flags", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireAuthenticated as jest.Mock).mockResolvedValue({ id: "rep1", role: "user" });
    (requireRole as jest.Mock).mockResolvedValue({ id: "cso1", role: "manager" });
    (prismadb.crm_Accounts.findFirst as jest.Mock).mockResolvedValue({
      id: "a1", name: "Acme", case_study_candidate: true, case_study_approved: false,
    });
    (prismadb.crm_Accounts.update as jest.Mock).mockResolvedValue({});
  });

  it("rep can flag a candidate", async () => {
    (prismadb.crm_Accounts.findFirst as jest.Mock).mockResolvedValue({
      id: "a1", case_study_candidate: false, case_study_approved: false,
    });
    const res = await setCaseStudyCandidate("a1", true);
    expect(res).toEqual({});
    const data = (prismadb.crm_Accounts.update as jest.Mock).mock.calls[0][0].data;
    expect(data.case_study_candidate).toBe(true);
  });

  it("unflagging a candidate also clears approval", async () => {
    (prismadb.crm_Accounts.findFirst as jest.Mock).mockResolvedValue({
      id: "a1", case_study_candidate: true, case_study_approved: true,
    });
    await setCaseStudyCandidate("a1", false);
    const data = (prismadb.crm_Accounts.update as jest.Mock).mock.calls[0][0].data;
    expect(data).toMatchObject({ case_study_candidate: false, case_study_approved: false });
  });

  it("manager approves a flagged candidate", async () => {
    const res = await setCaseStudyApproved("a1", true);
    expect(res).toEqual({});
    const data = (prismadb.crm_Accounts.update as jest.Mock).mock.calls[0][0].data;
    expect(data.case_study_approved).toBe(true);
  });

  it("cannot approve an account that is not a candidate", async () => {
    (prismadb.crm_Accounts.findFirst as jest.Mock).mockResolvedValue({
      id: "a1", case_study_candidate: false, case_study_approved: false,
    });
    const res = await setCaseStudyApproved("a1", true);
    expect(res.error).toBeDefined();
    expect(prismadb.crm_Accounts.update).not.toHaveBeenCalled();
  });

  it("approval requires manager/admin", async () => {
    const { AuthorizationError } = jest.requireMock("@/lib/authz");
    (requireRole as jest.Mock).mockRejectedValue(new AuthorizationError());
    const res = await setCaseStudyApproved("a1", true);
    expect(res.error).toBeDefined();
  });
});
```

- [ ] **Step 2: RED** — module not found.

- [ ] **Step 3: Implement `actions/crm/accounts/case-study.ts`**

```ts
"use server";

import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit-log";
import {
  requireAuthenticated,
  requireRole,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

// Spec §3.8: clients with strong measurable results are flagged as
// case-study candidates; the CSO approves.
export async function setCaseStudyCandidate(
  accountId: string,
  candidate: boolean,
): Promise<{ error?: string }> {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    throw e;
  }

  const account = await prismadb.crm_Accounts.findFirst({
    where: { id: accountId, deletedAt: null },
  });
  if (!account) return { error: "Account not found" };

  await prismadb.crm_Accounts.update({
    where: { id: accountId },
    data: {
      case_study_candidate: candidate,
      // Withdrawing the candidacy withdraws any prior approval.
      ...(candidate ? {} : { case_study_approved: false }),
      updatedBy: user.id,
    },
  });
  await writeAuditLog({
    entityType: "account",
    entityId: accountId,
    action: "updated",
    changes: [
      { field: "case_study_candidate", old: account.case_study_candidate, new: candidate },
    ],
    userId: user.id,
  });
  revalidatePath("/[locale]/(routes)/crm/accounts", "page");
  return {};
}

export async function setCaseStudyApproved(
  accountId: string,
  approved: boolean,
): Promise<{ error?: string }> {
  let approver;
  try {
    approver = await requireRole(["manager", "admin"]);
  } catch (e) {
    if (e instanceof AuthenticationError || e instanceof AuthorizationError) {
      return { error: "Forbidden" };
    }
    throw e;
  }

  const account = await prismadb.crm_Accounts.findFirst({
    where: { id: accountId, deletedAt: null },
  });
  if (!account) return { error: "Account not found" };
  if (approved && !account.case_study_candidate)
    return { error: "Flag the account as a case-study candidate first." };

  await prismadb.crm_Accounts.update({
    where: { id: accountId },
    data: { case_study_approved: approved, updatedBy: approver.id },
  });
  await writeAuditLog({
    entityType: "account",
    entityId: accountId,
    action: "updated",
    changes: [
      { field: "case_study_approved", old: account.case_study_approved, new: approved },
    ],
    userId: approver.id,
  });
  revalidatePath("/[locale]/(routes)/crm/accounts", "page");
  return {};
}
```

If `writeAuditLog`'s `entityType` union does not include `"account"`, check `lib/audit-log.ts` for the correct value (e.g. `"account"` vs `"accounts"`) and use what the type allows — note it in your report.

- [ ] **Step 4: GREEN** — 5 tests pass.

- [ ] **Step 5: Build `CaseStudyCard.tsx` and mount it**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  setCaseStudyCandidate,
  setCaseStudyApproved,
} from "@/actions/crm/accounts/case-study";

type Props = {
  accountId: string;
  candidate: boolean;
  approved: boolean;
  canApprove: boolean; // manager/admin — computed server-side by the page
};

const CaseStudyCard = ({ accountId, candidate, approved, canApprove }: Props) => {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<{ error?: string }>) => {
    setBusy(true);
    try {
      const res = await fn();
      if (res.error) toast.error(res.error);
      else router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          Case study
          {approved ? (
            <Badge>Approved</Badge>
          ) : candidate ? (
            <Badge variant="secondary">Candidate</Badge>
          ) : null}
        </CardTitle>
        <div className="flex gap-2">
          {candidate ? (
            <Button size="sm" variant="outline" disabled={busy}
              onClick={() => run(() => setCaseStudyCandidate(accountId, false))}>
              Withdraw candidacy
            </Button>
          ) : (
            <Button size="sm" variant="outline" disabled={busy}
              onClick={() => run(() => setCaseStudyCandidate(accountId, true))}>
              Flag as candidate
            </Button>
          )}
          {canApprove && candidate && !approved && (
            <Button size="sm" disabled={busy}
              onClick={() => run(() => setCaseStudyApproved(accountId, true))}>
              Approve case study
            </Button>
          )}
          {canApprove && approved && (
            <Button size="sm" variant="outline" disabled={busy}
              onClick={() => run(() => setCaseStudyApproved(accountId, false))}>
              Revoke approval
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Clients with strong measurable results are flagged here; a manager
        approves before marketing may reference them.
      </CardContent>
    </Card>
  );
};

export default CaseStudyCard;
```

In `accounts/[accountId]/page.tsx`: read the file; after `<BasicView data={account} />` render

```tsx
<CaseStudyCard
  accountId={account.id}
  candidate={account.case_study_candidate}
  approved={account.case_study_approved}
  canApprove={sessionRole === "manager" || sessionRole === "admin"}
/>
```

where `sessionRole` comes from the page's existing session/`getSession()` access (add `const session = await getSession()` if the page doesn't already have it, per its imports).

- [ ] **Step 6: Typecheck + full suite, commit**

```bash
git add actions/crm/accounts/case-study.ts actions/crm/accounts/__tests__/case-study.test.ts "app/[locale]/(routes)/crm/accounts/[accountId]"
git commit -m "feat(crm): case-study candidate/approval flags on accounts"
```

---

### Task 6: Docs — runbook §8, roadmap, smoke test

**Files:**
- Modify: `docs/internal/aqunama-setup-runbook.md` (append §8)
- Modify: `docs/superpowers/plans/2026-07-16-aqunama-roadmap.md` (mark Plan 3 implemented)
- Create: `docs/internal/aqunama-p3-smoke-test.md`

- [ ] **Step 1: Append to the runbook**

```markdown
## 8. Phase 3: quote approvals & case studies

- Reps: open the deal → **Request approval** (attach the SOW/quote to the
  deal's documents first). The deal cannot move into the Qualified stage
  until a manager/admin approves — the kanban/form will refuse with an
  explanatory error.
- Managers/admins (CSO): work the **CRM → Approvals** queue — approve, or
  reject with a note (the rep is emailed either way). Re-request after
  fixing a rejection.
- Case studies: on the account detail, reps flag **case-study candidates**;
  managers/admins approve them (spec §3.8).
```

- [ ] **Step 2: Update the roadmap** — change the Plan 3 heading to `## Plan 3 — Minimal SOW/Quote Approval ✅ implemented (2026-07-19)` and add: `Full plan: docs/superpowers/plans/2026-07-19-aqunama-p3-approval-workflow.md — decisions: hard gate on Qualified entry; approvers = manager+admin; queue at /crm/approvals.`

- [ ] **Step 3: Write `docs/internal/aqunama-p3-smoke-test.md`**

```markdown
# AQUNAMA Phase 3 — Manual Smoke Test (~15 min)

Prereqs: dev deployment, one admin/manager login (CSO) + one plain-user
login (rep) — or one admin doing both sides. A throwaway deal in a
pre_sale-kind stage.

## 1. Gate blocks unapproved deals (2 min)
- [ ] Drag the test deal into the Qualified-trigger stage on the kanban →
      error toast "Quote approval is required…"; deal stays put.
- [ ] Same via the deal's Update form → same error.

## 2. Request approval (3 min)
- [ ] Deal detail → **Request approval** → success toast; badge shows
      "Approval pending"; the button disappears.
- [ ] Second request attempt (reload → button gone; via another tab if
      open) errors "already pending".
- [ ] Manager/admin users receive the request email with queue + deal links.

## 3. Approve & pass the gate (4 min)
- [ ] As CSO: **CRM → Approvals** shows the deal (account, rep, budget,
      requested date). Approvals nav item is hidden for plain users, and
      opening /crm/approvals as a plain user redirects away.
- [ ] Approve → row disappears; rep gets the "approved" email; deal badge
      shows "Approved".
- [ ] Drag the deal into the Qualified stage → succeeds now (and the
      Phase 2 cadence run appears in Inngest).

## 4. Rejection loop (3 min)
- [ ] Flag a second test deal, request approval, then as CSO **Reject**
      with a note → rep email contains the note; badge "Rejected" (note in
      tooltip); gate still blocks; **Request approval** is available again.

## 5. Case study (3 min)
- [ ] Account detail → Case study card → **Flag as candidate** → badge
      "Candidate".
- [ ] As manager/admin: **Approve case study** → badge "Approved". Approve
      button never shows for plain users.
- [ ] **Withdraw candidacy** clears both badges (approval revoked too).
- [ ] Audit Log shows the approval-status and case-study changes.
```

- [ ] **Step 4: Commit**

```bash
git add docs/internal/aqunama-setup-runbook.md docs/superpowers/plans/2026-07-16-aqunama-roadmap.md docs/internal/aqunama-p3-smoke-test.md
git commit -m "docs(internal): Phase 3 approval workflow runbook and smoke test"
```

---

## Out of Scope

Structured `crm_Quotes` entity with line items/PDF (upgrade path preserved), approval history table, approval reminders/escalation timers, per-deal approver assignment, and Phase 4 (calendar sync).
