# AQUNAMA Phase 2 — Timer & Task Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automate the AQUNAMA funnel timing rules — the 45-day kill rule, the 5-touch quote follow-up cadence, Care check-ins, the 3-month target recycle, and renewal surfacing — as Inngest functions driven by admin-configurable stage kinds.

**Architecture:** A `stage_kind` column on `crm_Opportunities_Sales_Stages` (set in admin CRM settings) tells the automation which stage is Qualified/Care/etc., decoupled from admin-editable names. Stage changes emit a `crm/opportunity.stage-changed` Inngest event from a shared `handleStageTransition` helper wired into every stage-writing action; event-driven functions (cadence, care) use `step.sleepUntil` + `cancelOn` for scheduling, while sweep-style rules (kill rule, recycle, renewals) are daily/weekly crons. All date/eligibility decision logic lives in pure, unit-tested helpers in `lib/crm/`; the Inngest functions stay thin (repo convention, like `lib/campaigns/recipient-filters.ts`).

**Tech Stack:** Next.js 16 server actions, Prisma 7 (PostgreSQL), Inngest 4 (`step.sleepUntil`, `cancelOn`, cron triggers), Resend (direct `new Resend(...)` pattern in Inngest functions), Jest 30.

**Context docs:** `docs/superpowers/plans/2026-07-16-aqunama-roadmap.md` (Plan 2 stub), `docs/internal/matej-sales-projecesses.md` (spec §3.3, §3.5, §3.8), `docs/internal/aqunama-setup-runbook.md`.

**Decisions locked with the user (2026-07-18):**
- Client activity that restarts the 45-day clock = inbound synced email (folder INBOX, linked to the deal's contact or account) OR any non-deleted `crm_Activities` entry linked to the opportunity.
- Stage↔trigger connection is configurable in the administration (admin CRM settings sales-stage tab gets a kind selector).
- Business days = skip weekends only (no holiday calendar).
- Kill rule fires → `status: "CLOSED"` + email the assigned rep + audit log. Rep reopens by setting status back.
- All funnel timing values (kill days, recycle days, cadence offsets, care intervals, renewal window) are instance-grade settings configurable in the Administration UI; the spec values are the defaults.

**Documented deviations from the spec (rationale in tasks):**
- Recycle (§3.3) adds exhausted targets to a "Recycled" target list and notifies admins instead of auto-starting a sequence — `crm_campaign_sends` has `@@unique([step_id, target_id])`, so re-running the same campaign is a no-op by design; a human picks the new campaign for recycled batches.
- Cadence (§3.5) creates tasks for every Qualified deal (no low/high-value distinction — no such field exists yet).
- Care quarterly check-ins (§3.8) are bounded at 8 quarters (2 years) per Care entry, then stop.

## Global Constraints

- Run tests with `pnpm test -- <path>` (jest) or `./node_modules/.bin/jest <path>`; typecheck with `pnpm exec tsc --noEmit`. The full suite is green (921+ tests) — any failure you introduce is a regression.
- CI (four blocking jobs incl. 95-spec e2e) runs on every push to `dev`; do not push until the local full suite and typecheck pass.
- Prisma migrations: `pnpm exec prisma migrate dev --name <name>`; the migration chain MUST replay on a fresh database (CI enforces this).
- Server actions: `"use server"`, `getSession()` auth, `{ error: string }` returns. Inngest functions have no session — write `createdBy`/`updatedBy` from the deal's `assigned_to` where a user id is needed.
- Inngest: client is untyped (`inngest/client.ts`); new functions register in `app/api/inngest/route.ts` (import + add to `functions` array). Event payloads are cast at the consumer (`event.data as {...}`).
- Emails from Inngest functions use the direct pattern: `const resend = new Resend(process.env.RESEND_API_KEY)`, `from: process.env.RESEND_FROM_EMAIL!` (see `inngest/functions/reports/send-scheduled.ts`).
- Conventional commits on `dev`. Never stage: `AGENTS.md`, `lib/enrichment/e2b/agent-script.ts`, untracked docs, `.superpowers/`.
- `stage_kind` values are exactly: `"pre_sale" | "qualified" | "purchase_order" | "delivery" | "care"` (nullable = no automation).
- Cadence timings (spec §3.5, from Qualified entry E): touch 1 = E + 3 business days (call); touch 2 = touch1 + 7 calendar days (email); touch 3 = touch2 + 10 days (email/call); touch 4 = touch3 + 15 days (call); touch 5 = touch3 + 45 days (final reminder email offering a 15-day quote extension).
- Kill rule: 45 calendar days of client silence; clock restarts from the latest of stage-entry, inbound email, logged activity.
- Care: check-in at +30 days, referral-ask at +90 days, then quarterly (+90-day steps, max 8).
- Recycle: sequence finished (last step of its campaign sent) ≥ 90 days ago, target not converted, `do_not_email: false`, not already in the "Recycled" list.
- Renewals: weekly sweep; surface `crm_Contracts.renewalReminderDate` and `crm_AccountProducts.renewal_date` falling within the next 30 days as tasks (idempotent by task title).
- **Timing configurability:** every number above is the DEFAULT of an instance-grade setting stored in a singleton `crm_FunnelSettings` row and edited at Admin → Funnel settings. Pure timer functions take a `FunnelTimingSettings` parameter defaulting to `DEFAULT_FUNNEL_SETTINGS`; Inngest functions load the current settings via `getFunnelSettings()` at run/entry time. Cadence and Care schedules are computed once at stage entry with the settings current at that moment (later setting changes affect future entries only — document this in the admin UI copy).

---

### Task 1: Schema — stage_kind, task↔opportunity link, stage_entered_at

**Files:**
- Modify: `prisma/schema.prisma` (models `crm_Opportunities_Sales_Stages` ~line 394, `crm_Accounts_Tasks` ~line 843, `crm_Opportunities` ~line 196)
- Modify: `prisma/seeds/seed.ts` (sales-stage seeding + demo data)

**Interfaces:**
- Produces: `crm_Opportunities_Sales_Stages.stage_kind: string | null`; `crm_Accounts_Tasks.opportunity_id: string | null` (+ relation `opportunity` and back-relation `tasks` on `crm_Opportunities`); `crm_Opportunities.stage_entered_at: Date | null`. All later tasks rely on these generated client fields.

- [ ] **Step 1: Edit the three models**

In `model crm_Opportunities_Sales_Stages`, after `order Int?` add:

```prisma
  /// Automation trigger kind — connectable per stage in admin CRM settings.
  /// One of: pre_sale | qualified | purchase_order | delivery | care. Null = no automation.
  stage_kind                         String?
```

In `model crm_Opportunities`, after `delivery_deadline DateTime?` add:

```prisma
  /// Set whenever sales_stage changes; anchors cadence/care timers.
  stage_entered_at  DateTime?
```

and to its relations block (next to `lineItems`):

```prisma
  tasks                crm_Accounts_Tasks[]
```

Add a new model (near the other CRM settings-ish models, e.g. after `crm_Opportunities_Sales_Stages`) — the instance-grade funnel timing settings, singleton by convention (`findFirst`; the admin action creates/updates the first row):

```prisma
/// Instance-grade funnel timing settings (singleton row). Defaults are the
/// AQUNAMA spec values; edited at Admin -> Funnel settings.
model crm_FunnelSettings {
  id                           String    @id @default(uuid()) @db.Uuid
  kill_after_days              Int       @default(45)
  recycle_after_days           Int       @default(90)
  cadence_touch1_business_days Int       @default(3)
  cadence_touch2_offset_days   Int       @default(7)
  cadence_touch3_offset_days   Int       @default(10)
  cadence_touch4_offset_days   Int       @default(15)
  cadence_touch5_offset_days   Int       @default(45)
  care_checkin_days            Int       @default(30)
  care_referral_days           Int       @default(90)
  care_quarter_interval_days   Int       @default(90)
  care_quarter_count           Int       @default(8)
  renewal_window_days          Int       @default(30)
  updatedAt                    DateTime? @updatedAt
  updatedBy                    String?   @db.Uuid
}
```

In `model crm_Accounts_Tasks`, next to the `account` field add:

```prisma
  opportunity_id String? @db.Uuid
```

next to the `assigned_account` relation add:

```prisma
  opportunity    crm_Opportunities? @relation(fields: [opportunity_id], references: [id])
```

and an index alongside the existing ones:

```prisma
  @@index([opportunity_id])
```

- [ ] **Step 2: Create the migration**

Run: `pnpm exec prisma migrate dev --name aqunama_p2_stage_kind_task_opportunity`
Expected: migration applied, client regenerated. (If the local DB is unreachable, author SQL via `prisma migrate diff` and stop — report BLOCKED.)

- [ ] **Step 3: Seed stage kinds**

In `prisma/seeds/seed.ts`, directly after the sales-stages seeding loop (the block using `crmOpportunitySaleStagesData`), add:

```ts
  // Connect automation kinds to the runbook stages (idempotent; matches by
  // name, skips stages an admin renamed — kinds are then set in admin UI).
  const stageKindByName: Record<string, string> = {
    "Pre-Sale": "pre_sale",
    "Qualified Lead": "qualified",
    "Purchase Order": "purchase_order",
    "Delivery": "delivery",
    "Care": "care",
  };
  for (const [name, kind] of Object.entries(stageKindByName)) {
    await prisma.crm_Opportunities_Sales_Stages.updateMany({
      where: { name, stage_kind: null },
      data: { stage_kind: kind },
    });
  }
  console.log("Sales stage kinds connected");
```

Note: the JSON seed file `prisma/initial-data/crm_Opportunities_Sales_Stages.json` may use different names — read it and extend `stageKindByName` with a sensible mapping for any stage whose intent is obvious (e.g. a "Qualification" stage → `qualified`); leave others unmapped.

- [ ] **Step 4: Verify on a fresh database**

```bash
docker run -d --name p2seed -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=p2 -p 55432:5432 pgvector/pgvector:pg16
for i in $(seq 1 20); do docker exec p2seed pg_isready -U postgres -q && break; sleep 1; done
DATABASE_URL=postgresql://postgres:postgres@localhost:55432/p2 pnpm exec prisma migrate deploy
SEED_DEMO_DATA=1 DATABASE_URL=postgresql://postgres:postgres@localhost:55432/p2 pnpm exec prisma db seed
docker exec p2seed psql -U postgres -d p2 -tc 'SELECT name, stage_kind FROM "crm_Opportunities_Sales_Stages";'
docker rm -f p2seed
```

Expected: migrations apply; seeded stages show their kinds.

- [ ] **Step 5: Typecheck and full jest**

Run: `pnpm exec tsc --noEmit && ./node_modules/.bin/jest --ci --testPathIgnorePatterns "__tests__/invoices/lifecycle"`
Expected: clean / all pass.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations prisma/seeds/seed.ts
git commit -m "feat(crm): stage_kind on sales stages, task-opportunity link, stage_entered_at"
```

---

### Task 2: Stage-transition helper wired into every stage-writing action

**Files:**
- Create: `lib/crm/stage-transition.ts`
- Modify: `actions/crm/opportunities/update-opportunity.ts` (after the `crm_Opportunities.update`, before the audit log)
- Modify: `actions/crm/opportunities/create-opportunity.ts` and `actions/crm/targets/convert-target-to-deal.ts` (set `stage_entered_at` at creation; fire the event)
- Test: `__tests__/crm/stage-transition.test.ts`

**Interfaces:**
- Produces: `handleStageTransition(opts: { opportunityId: string; fromStage: string | null; toStage: string | null }): Promise<boolean>` — returns false (no-op) when stages are equal or `toStage` is null; otherwise updates `stage_entered_at = new Date()` on the opportunity and fires `inngest.send({ name: "crm/opportunity.stage-changed", data: { record_id, to_stage } })`, returning true. Event payload contract for Tasks 4/6: `{ record_id: string; to_stage: string }`.

- [ ] **Step 1: Write the failing test**

Create `__tests__/crm/stage-transition.test.ts`:

```ts
jest.mock("@/lib/prisma", () => ({
  prismadb: { crm_Opportunities: { update: jest.fn() } },
}));
jest.mock("@/inngest/client", () => ({
  inngest: { send: jest.fn().mockResolvedValue({}) },
}));

import { prismadb } from "@/lib/prisma";
import { inngest } from "@/inngest/client";
import { handleStageTransition } from "@/lib/crm/stage-transition";

describe("handleStageTransition", () => {
  beforeEach(() => jest.clearAllMocks());

  it("no-ops when the stage did not change", async () => {
    const acted = await handleStageTransition({
      opportunityId: "o1", fromStage: "s1", toStage: "s1",
    });
    expect(acted).toBe(false);
    expect(prismadb.crm_Opportunities.update).not.toHaveBeenCalled();
    expect(inngest.send).not.toHaveBeenCalled();
  });

  it("no-ops when toStage is null", async () => {
    const acted = await handleStageTransition({
      opportunityId: "o1", fromStage: "s1", toStage: null,
    });
    expect(acted).toBe(false);
  });

  it("stamps stage_entered_at and emits the event on a real transition", async () => {
    (prismadb.crm_Opportunities.update as jest.Mock).mockResolvedValue({});
    const acted = await handleStageTransition({
      opportunityId: "o1", fromStage: "s1", toStage: "s2",
    });
    expect(acted).toBe(true);
    expect(prismadb.crm_Opportunities.update).toHaveBeenCalledWith({
      where: { id: "o1" },
      data: { stage_entered_at: expect.any(Date) },
    });
    expect(inngest.send).toHaveBeenCalledWith({
      name: "crm/opportunity.stage-changed",
      data: { record_id: "o1", to_stage: "s2" },
    });
  });

  it("treats null -> stage as a transition (first stage assignment)", async () => {
    (prismadb.crm_Opportunities.update as jest.Mock).mockResolvedValue({});
    const acted = await handleStageTransition({
      opportunityId: "o1", fromStage: null, toStage: "s2",
    });
    expect(acted).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `./node_modules/.bin/jest __tests__/crm/stage-transition.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/crm/stage-transition.ts`**

```ts
import { prismadb } from "@/lib/prisma";
import { inngest } from "@/inngest/client";

// Single funnel-transition chokepoint: every action that writes
// crm_Opportunities.sales_stage calls this after its update so the
// timer engine (cadence/care) reacts to exactly one event shape.
export async function handleStageTransition(opts: {
  opportunityId: string;
  fromStage: string | null;
  toStage: string | null;
}): Promise<boolean> {
  const { opportunityId, fromStage, toStage } = opts;
  if (!toStage || toStage === fromStage) return false;

  await prismadb.crm_Opportunities.update({
    where: { id: opportunityId },
    data: { stage_entered_at: new Date() },
  });
  await inngest.send({
    name: "crm/opportunity.stage-changed",
    data: { record_id: opportunityId, to_stage: toStage },
  });
  return true;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `./node_modules/.bin/jest __tests__/crm/stage-transition.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Wire into the three stage-writing actions**

First run `grep -rn "sales_stage" actions/ | grep -vE "__tests__|select|where|include"` and confirm the writers are exactly: `update-opportunity.ts`, `create-opportunity.ts`, `convert-target-to-deal.ts` (plus any kanban/drag action the grep reveals — wire it identically and note it in your report).

In `actions/crm/opportunities/update-opportunity.ts`, after the `const opportunity = await prismadb.crm_Opportunities.update({...})` call and before the audit-log block, add (the `before` row is already fetched above):

```ts
    await handleStageTransition({
      opportunityId: opportunity.id,
      fromStage: before?.sales_stage ?? null,
      toStage: opportunity.sales_stage ?? null,
    });
```

with `import { handleStageTransition } from "@/lib/crm/stage-transition";` at the top.

In `create-opportunity.ts` and `convert-target-to-deal.ts`, add `stage_entered_at: new Date(),` to the `crm_Opportunities.create` data (both set a stage at creation), and after the create call add:

```ts
    await handleStageTransition({
      opportunityId: opportunity.id,
      fromStage: null,
      toStage: opportunity.sales_stage ?? null,
    });
```

(The helper's own `stage_entered_at` update is redundant-but-harmless there; do not special-case it.)

- [ ] **Step 6: Update affected existing tests, typecheck, run suites**

`actions/crm/targets/__tests__/convert-target-to-deal.test.ts` mocks prisma narrowly — add `update: jest.fn()` to its `crm_Opportunities` mock so `handleStageTransition` works, and assert the event: after the happy-path create, `expect(inngest.send).toHaveBeenCalledWith({ name: "crm/opportunity.stage-changed", data: { record_id: "opp-1", to_stage: "stage-presale" } })`.

Run: `pnpm exec tsc --noEmit && ./node_modules/.bin/jest --ci --testPathIgnorePatterns "__tests__/invoices/lifecycle"`
Expected: clean / all pass.

- [ ] **Step 7: Commit**

```bash
git add lib/crm/stage-transition.ts __tests__/crm/stage-transition.test.ts actions/crm/opportunities/update-opportunity.ts actions/crm/opportunities/create-opportunity.ts actions/crm/targets/convert-target-to-deal.ts actions/crm/targets/__tests__/convert-target-to-deal.test.ts
git commit -m "feat(crm): emit crm/opportunity.stage-changed from all stage-writing actions"
```

(Include the kanban action + its test in the `git add` if the grep found one.)

---

### Task 3: Pure timer logic — business days, cadence schedule, kill/renewal predicates

**Files:**
- Create: `lib/crm/business-days.ts`
- Create: `lib/crm/funnel-timers.ts`
- Test: `__tests__/crm/business-days.test.ts`, `__tests__/crm/funnel-timers.test.ts`

**Files (additional):**
- Create: `lib/crm/funnel-settings.ts` (DB-backed settings loader; the pure modules must NOT import prisma)

**Interfaces:**
- Produces (consumed by Tasks 4–8 and the admin Task 10):
  - `FunnelTimingSettings` type + `DEFAULT_FUNNEL_SETTINGS` const (exported from `lib/crm/funnel-timers.ts`): `{ killAfterDays: 45; recycleAfterDays: 90; cadenceTouch1BusinessDays: 3; cadenceTouch2OffsetDays: 7; cadenceTouch3OffsetDays: 10; cadenceTouch4OffsetDays: 15; cadenceTouch5OffsetDays: 45; careCheckinDays: 30; careReferralDays: 90; careQuarterIntervalDays: 90; careQuarterCount: 8; renewalWindowDays: 30 }` (all `number`).
  - `addBusinessDays(start: Date, n: number): Date` — skips Sat/Sun; n ≥ 0.
  - `cadenceSchedule(qualifiedEntry: Date, s: FunnelTimingSettings = DEFAULT_FUNNEL_SETTINGS): Array<{ touch: number; date: Date; kind: "call" | "email"; title: string; content: string }>` — exactly 5 entries.
  - `resolveLastClientActivity(d: { stageEnteredAt: Date | null; lastInboundEmailAt: Date | null; lastLoggedActivityAt: Date | null }): Date | null` — max of the non-null dates.
  - `isKillDue(lastActivity: Date | null, now: Date, s: FunnelTimingSettings = DEFAULT_FUNNEL_SETTINGS): boolean` — true when lastActivity is non-null and ≥ `s.killAfterDays` days before `now`.
  - `careSchedule(careEntry: Date, s: FunnelTimingSettings = DEFAULT_FUNNEL_SETTINGS): Array<{ date: Date; title: string; content: string }>` — check-in at `+careCheckinDays`, referral at `+careReferralDays`, then `careQuarterCount` entries every `careQuarterIntervalDays`.
  - `renewalWindowEnd(now: Date, s: FunnelTimingSettings = DEFAULT_FUNNEL_SETTINGS): Date` — now + `s.renewalWindowDays` days.
  - `getFunnelSettings(): Promise<FunnelTimingSettings>` (from `lib/crm/funnel-settings.ts`) — reads the singleton `crm_FunnelSettings` row, mapping snake_case columns to the camelCase type; returns `DEFAULT_FUNNEL_SETTINGS` when no row exists.

- [ ] **Step 1: Write the failing tests**

Create `__tests__/crm/business-days.test.ts`:

```ts
import { addBusinessDays } from "@/lib/crm/business-days";

describe("addBusinessDays", () => {
  it("adds within a week", () => {
    // Wed 2026-07-15 + 2 -> Fri 2026-07-17
    expect(addBusinessDays(new Date("2026-07-15T10:00:00Z"), 2)).toEqual(
      new Date("2026-07-17T10:00:00Z"),
    );
  });
  it("skips a weekend", () => {
    // Thu 2026-07-16 + 3 -> Tue 2026-07-21
    expect(addBusinessDays(new Date("2026-07-16T10:00:00Z"), 3)).toEqual(
      new Date("2026-07-21T10:00:00Z"),
    );
  });
  it("starting on Saturday counts from the next Monday", () => {
    // Sat 2026-07-18 + 1 -> Mon 2026-07-20
    expect(addBusinessDays(new Date("2026-07-18T10:00:00Z"), 1)).toEqual(
      new Date("2026-07-20T10:00:00Z"),
    );
  });
  it("n=0 returns the same instant", () => {
    const d = new Date("2026-07-15T10:00:00Z");
    expect(addBusinessDays(d, 0)).toEqual(d);
  });
});
```

Create `__tests__/crm/funnel-timers.test.ts`:

```ts
import {
  cadenceSchedule,
  resolveLastClientActivity,
  isKillDue,
  careSchedule,
  renewalWindowEnd,
} from "@/lib/crm/funnel-timers";
import { addBusinessDays } from "@/lib/crm/business-days";

const DAY = 24 * 60 * 60 * 1000;

describe("cadenceSchedule", () => {
  // Wed 2026-07-15
  const entry = new Date("2026-07-15T09:00:00Z");
  const s = cadenceSchedule(entry);

  it("produces 5 touches with spec timings", () => {
    expect(s).toHaveLength(5);
    const t1 = addBusinessDays(entry, 3);
    expect(s[0]).toMatchObject({ touch: 1, kind: "call", date: t1 });
    expect(s[1]).toMatchObject({ touch: 2, kind: "email", date: new Date(t1.getTime() + 7 * DAY) });
    const t3 = new Date(t1.getTime() + 17 * DAY);
    expect(s[2]).toMatchObject({ touch: 3, kind: "email", date: t3 });
    expect(s[3]).toMatchObject({ touch: 4, kind: "call", date: new Date(t3.getTime() + 15 * DAY) });
    expect(s[4]).toMatchObject({ touch: 5, kind: "email", date: new Date(t3.getTime() + 45 * DAY) });
  });

  it("every touch has a non-empty title and content", () => {
    for (const t of s) {
      expect(t.title.length).toBeGreaterThan(0);
      expect(t.content.length).toBeGreaterThan(0);
    }
  });
});

describe("resolveLastClientActivity / isKillDue", () => {
  const now = new Date("2026-07-18T00:00:00Z");

  it("takes the max of available dates", () => {
    expect(
      resolveLastClientActivity({
        stageEnteredAt: new Date("2026-01-01"),
        lastInboundEmailAt: new Date("2026-06-01"),
        lastLoggedActivityAt: new Date("2026-03-01"),
      }),
    ).toEqual(new Date("2026-06-01"));
  });

  it("returns null when nothing is known", () => {
    expect(
      resolveLastClientActivity({
        stageEnteredAt: null, lastInboundEmailAt: null, lastLoggedActivityAt: null,
      }),
    ).toBeNull();
  });

  it("kill is due at 45+ days of silence, not before, never on null", () => {
    expect(isKillDue(new Date(now.getTime() - 46 * DAY), now)).toBe(true);
    expect(isKillDue(new Date(now.getTime() - 45 * DAY), now)).toBe(true);
    expect(isKillDue(new Date(now.getTime() - 44 * DAY), now)).toBe(false);
    expect(isKillDue(null, now)).toBe(false);
  });
});

describe("careSchedule", () => {
  const entry = new Date("2026-07-01T09:00:00Z");
  const s = careSchedule(entry);

  it("is +30d check-in, +90d referral, then 8 quarterly entries", () => {
    expect(s).toHaveLength(10);
    expect(s[0].date).toEqual(new Date(entry.getTime() + 30 * DAY));
    expect(s[1].date).toEqual(new Date(entry.getTime() + 90 * DAY));
    expect(s[2].date).toEqual(new Date(entry.getTime() + 180 * DAY));
    expect(s[9].date).toEqual(new Date(entry.getTime() + (90 + 8 * 90) * DAY));
  });
});

describe("renewalWindowEnd", () => {
  it("is now + 30 days", () => {
    const now = new Date("2026-07-18T00:00:00Z");
    expect(renewalWindowEnd(now)).toEqual(new Date(now.getTime() + 30 * DAY));
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `./node_modules/.bin/jest __tests__/crm/business-days.test.ts __tests__/crm/funnel-timers.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `lib/crm/business-days.ts`**

```ts
// Business-day arithmetic, weekends-only (no holiday calendar — decided
// 2026-07-18; a task landing near a holiday just waits a day).
export function addBusinessDays(start: Date, n: number): Date {
  const d = new Date(start.getTime());
  let remaining = n;
  while (remaining > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) remaining -= 1;
  }
  // A 0-add starting on a weekend still lands on the weekend; only shifts
  // when days are actually added — matches "3 business days after X".
  return d;
}
```

- [ ] **Step 4: Implement `lib/crm/funnel-timers.ts`**

```ts
import { addBusinessDays } from "./business-days";

const DAY = 24 * 60 * 60 * 1000;

// Instance-grade timing knobs; the spec's numbers are the defaults, the
// live values come from crm_FunnelSettings (Admin -> Funnel settings) via
// lib/crm/funnel-settings.ts. This module stays prisma-free and pure.
export type FunnelTimingSettings = {
  killAfterDays: number;
  recycleAfterDays: number;
  cadenceTouch1BusinessDays: number;
  cadenceTouch2OffsetDays: number;
  cadenceTouch3OffsetDays: number;
  cadenceTouch4OffsetDays: number;
  cadenceTouch5OffsetDays: number;
  careCheckinDays: number;
  careReferralDays: number;
  careQuarterIntervalDays: number;
  careQuarterCount: number;
  renewalWindowDays: number;
};

export const DEFAULT_FUNNEL_SETTINGS: FunnelTimingSettings = {
  killAfterDays: 45,
  recycleAfterDays: 90,
  cadenceTouch1BusinessDays: 3,
  cadenceTouch2OffsetDays: 7,
  cadenceTouch3OffsetDays: 10,
  cadenceTouch4OffsetDays: 15,
  cadenceTouch5OffsetDays: 45,
  careCheckinDays: 30,
  careReferralDays: 90,
  careQuarterIntervalDays: 90,
  careQuarterCount: 8,
  renewalWindowDays: 30,
};

export type CadenceTouch = {
  touch: number;
  date: Date;
  kind: "call" | "email";
  title: string;
  content: string;
};

// Spec §3.5 follow-up cadence, anchored on Qualified-stage entry (quote sent).
export function cadenceSchedule(
  qualifiedEntry: Date,
  s: FunnelTimingSettings = DEFAULT_FUNNEL_SETTINGS,
): CadenceTouch[] {
  const t1 = addBusinessDays(qualifiedEntry, s.cadenceTouch1BusinessDays);
  const t2 = new Date(t1.getTime() + s.cadenceTouch2OffsetDays * DAY);
  const t3 = new Date(t2.getTime() + s.cadenceTouch3OffsetDays * DAY);
  const t4 = new Date(t3.getTime() + s.cadenceTouch4OffsetDays * DAY);
  const t5 = new Date(t3.getTime() + s.cadenceTouch5OffsetDays * DAY);
  return [
    {
      touch: 1, date: t1, kind: "call",
      title: "Cadence 1/5: Call — confirm quote receipt",
      content: "Call the client: confirm they received the quote/SOW and ask for questions.",
    },
    {
      touch: 2, date: t2, kind: "email",
      title: "Cadence 2/5: Email check-in",
      content: "Send a short check-in email about the outstanding quote.",
    },
    {
      touch: 3, date: t3, kind: "email",
      title: "Cadence 3/5: Email or call",
      content: "Reach out (email or call) — surface objections, offer a walkthrough.",
    },
    {
      touch: 4, date: t4, kind: "call",
      title: "Cadence 4/5: Call (day 15 of retention window)",
      content: "Call the client — the quote has been out ~5 weeks; probe timeline and blockers.",
    },
    {
      touch: 5, date: t5, kind: "email",
      title: "Cadence 5/5: Final reminder — offer 15-day quote extension",
      content: "Send the final reminder email; offer to extend the quote validity by 15 days if they need more time.",
    },
  ];
}

export function resolveLastClientActivity(d: {
  stageEnteredAt: Date | null;
  lastInboundEmailAt: Date | null;
  lastLoggedActivityAt: Date | null;
}): Date | null {
  const dates = [d.stageEnteredAt, d.lastInboundEmailAt, d.lastLoggedActivityAt]
    .filter((x): x is Date => x != null);
  if (dates.length === 0) return null;
  return new Date(Math.max(...dates.map((x) => x.getTime())));
}

export function isKillDue(
  lastActivity: Date | null,
  now: Date,
  s: FunnelTimingSettings = DEFAULT_FUNNEL_SETTINGS,
): boolean {
  if (!lastActivity) return false;
  return now.getTime() - lastActivity.getTime() >= s.killAfterDays * DAY;
}

export type CareEntry = { date: Date; title: string; content: string };

// Spec §3.8: check-in, referral ask, then bounded quarterly touchpoints —
// all intervals instance-configurable.
export function careSchedule(
  careEntry: Date,
  s: FunnelTimingSettings = DEFAULT_FUNNEL_SETTINGS,
): CareEntry[] {
  const entries: CareEntry[] = [
    {
      date: new Date(careEntry.getTime() + s.careCheckinDays * DAY),
      title: `Care: ${s.careCheckinDays}-day check-in`,
      content: "Check in with the client — satisfaction, issues, quick wins since deployment.",
    },
    {
      date: new Date(careEntry.getTime() + s.careReferralDays * DAY),
      title: "Care: referral ask",
      content: "Results should be measurable by now — ask for a referral and probe upsell openings.",
    },
  ];
  for (let q = 1; q <= s.careQuarterCount; q++) {
    entries.push({
      date: new Date(
        careEntry.getTime() + (s.careReferralDays + q * s.careQuarterIntervalDays) * DAY,
      ),
      title: `Care: quarterly check-in (Q${q})`,
      content: "Quarterly relationship check-in — satisfaction, renewals, expansion opportunities.",
    });
  }
  return entries;
}

export function renewalWindowEnd(
  now: Date,
  s: FunnelTimingSettings = DEFAULT_FUNNEL_SETTINGS,
): Date {
  return new Date(now.getTime() + s.renewalWindowDays * DAY);
}
```

- [ ] **Step 4b: Implement `lib/crm/funnel-settings.ts` (DB loader)**

```ts
import { prismadb } from "@/lib/prisma";
import {
  DEFAULT_FUNNEL_SETTINGS,
  type FunnelTimingSettings,
} from "./funnel-timers";

// Singleton-by-convention read of the instance funnel settings. No row
// yet (fresh install) -> spec defaults.
export async function getFunnelSettings(): Promise<FunnelTimingSettings> {
  const row = await prismadb.crm_FunnelSettings.findFirst();
  if (!row) return DEFAULT_FUNNEL_SETTINGS;
  return {
    killAfterDays: row.kill_after_days,
    recycleAfterDays: row.recycle_after_days,
    cadenceTouch1BusinessDays: row.cadence_touch1_business_days,
    cadenceTouch2OffsetDays: row.cadence_touch2_offset_days,
    cadenceTouch3OffsetDays: row.cadence_touch3_offset_days,
    cadenceTouch4OffsetDays: row.cadence_touch4_offset_days,
    cadenceTouch5OffsetDays: row.cadence_touch5_offset_days,
    careCheckinDays: row.care_checkin_days,
    careReferralDays: row.care_referral_days,
    careQuarterIntervalDays: row.care_quarter_interval_days,
    careQuarterCount: row.care_quarter_count,
    renewalWindowDays: row.renewal_window_days,
  };
}
```

Add to `__tests__/crm/funnel-timers.test.ts` (settings-override coverage) — plus a loader test in the same file:

```ts
import { getFunnelSettings } from "@/lib/crm/funnel-settings";
// at the top of the file:
jest.mock("@/lib/prisma", () => ({
  prismadb: { crm_FunnelSettings: { findFirst: jest.fn() } },
}));
import { prismadb } from "@/lib/prisma";
import { DEFAULT_FUNNEL_SETTINGS } from "@/lib/crm/funnel-timers";

describe("settings overrides", () => {
  it("cadenceSchedule honors configured offsets", () => {
    const entry = new Date("2026-07-15T09:00:00Z"); // Wed
    const s = cadenceSchedule(entry, {
      ...DEFAULT_FUNNEL_SETTINGS,
      cadenceTouch1BusinessDays: 1,
      cadenceTouch2OffsetDays: 2,
    });
    const t1 = addBusinessDays(entry, 1);
    expect(s[0].date).toEqual(t1);
    expect(s[1].date).toEqual(new Date(t1.getTime() + 2 * DAY));
  });

  it("isKillDue honors a configured threshold", () => {
    const now = new Date("2026-07-18T00:00:00Z");
    const s = { ...DEFAULT_FUNNEL_SETTINGS, killAfterDays: 10 };
    expect(isKillDue(new Date(now.getTime() - 11 * DAY), now, s)).toBe(true);
    expect(isKillDue(new Date(now.getTime() - 9 * DAY), now, s)).toBe(false);
  });

  it("careSchedule honors configured quarter count", () => {
    const s = careSchedule(new Date("2026-07-01T09:00:00Z"), {
      ...DEFAULT_FUNNEL_SETTINGS,
      careQuarterCount: 2,
    });
    expect(s).toHaveLength(4);
  });
});

describe("getFunnelSettings", () => {
  it("returns defaults when no settings row exists", async () => {
    (prismadb.crm_FunnelSettings.findFirst as jest.Mock).mockResolvedValue(null);
    expect(await getFunnelSettings()).toEqual(DEFAULT_FUNNEL_SETTINGS);
  });

  it("maps a stored row to camelCase settings", async () => {
    (prismadb.crm_FunnelSettings.findFirst as jest.Mock).mockResolvedValue({
      kill_after_days: 30, recycle_after_days: 60,
      cadence_touch1_business_days: 2, cadence_touch2_offset_days: 5,
      cadence_touch3_offset_days: 7, cadence_touch4_offset_days: 10,
      cadence_touch5_offset_days: 30, care_checkin_days: 14,
      care_referral_days: 60, care_quarter_interval_days: 60,
      care_quarter_count: 4, renewal_window_days: 21,
    });
    const s = await getFunnelSettings();
    expect(s.killAfterDays).toBe(30);
    expect(s.renewalWindowDays).toBe(21);
  });
});
```

- [ ] **Step 5: Run to verify pass**

Run: `./node_modules/.bin/jest __tests__/crm/business-days.test.ts __tests__/crm/funnel-timers.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/crm/business-days.ts lib/crm/funnel-timers.ts lib/crm/funnel-settings.ts __tests__/crm/business-days.test.ts __tests__/crm/funnel-timers.test.ts
git commit -m "feat(crm): configurable timer logic — business days, cadence/care schedules, kill predicate, settings loader"
```

---

### Task 4: Auto-task creation helper + Qualified cadence Inngest function

**Files:**
- Create: `lib/crm/auto-task.ts`
- Create: `inngest/functions/crm/qualified-cadence.ts`
- Modify: `app/api/inngest/route.ts` (register)
- Test: `__tests__/crm/auto-task.test.ts`

**Interfaces:**
- Consumes: `cadenceSchedule` (Task 3), `crm/opportunity.stage-changed` event `{ record_id, to_stage }` (Task 2), `crm_Accounts_Tasks.opportunity_id` (Task 1).
- Produces: `createAutoTask(opts: { title: string; content: string; accountId: string | null; opportunityId?: string | null; assigneeId: string | null; dueDateAt: Date }): Promise<{ id: string } | null>` — creates a `crm_Accounts_Tasks` row (priority `"high"`, `taskStatus: "ACTIVE"`, `v: 0`, `createdBy`/`updatedBy`/`user` = assigneeId) and emails the assignee via direct Resend; returns null (skips) when `assigneeId` is null. Idempotent: returns null without creating when an ACTIVE/PENDING task with the same `title` and `opportunity_id` (or same title+account when no opportunity) already exists.

- [ ] **Step 1: Write the failing test**

Create `__tests__/crm/auto-task.test.ts`:

```ts
const mockSend = jest.fn();
jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({ emails: { send: mockSend } })),
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Accounts_Tasks: { findFirst: jest.fn(), create: jest.fn() },
    users: { findUnique: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { createAutoTask } from "@/lib/crm/auto-task";

describe("createAutoTask", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prismadb.crm_Accounts_Tasks.findFirst as jest.Mock).mockResolvedValue(null);
    (prismadb.crm_Accounts_Tasks.create as jest.Mock).mockResolvedValue({ id: "t1" });
    (prismadb.users.findUnique as jest.Mock).mockResolvedValue({
      id: "u1", email: "rep@x.cz", userLanguage: "en",
    });
    mockSend.mockResolvedValue({ data: { id: "r1" }, error: null });
  });

  it("creates the task and notifies the assignee", async () => {
    const res = await createAutoTask({
      title: "Cadence 1/5: Call — confirm quote receipt",
      content: "Call the client.",
      accountId: "a1",
      opportunityId: "o1",
      assigneeId: "u1",
      dueDateAt: new Date("2026-08-01"),
    });
    expect(res).toEqual({ id: "t1" });
    const data = (prismadb.crm_Accounts_Tasks.create as jest.Mock).mock.calls[0][0].data;
    expect(data).toMatchObject({
      v: 0, priority: "high", taskStatus: "ACTIVE",
      account: "a1", opportunity_id: "o1",
      user: "u1", createdBy: "u1", updatedBy: "u1",
    });
    expect(mockSend).toHaveBeenCalled();
  });

  it("skips when an open task with the same title exists for the deal", async () => {
    (prismadb.crm_Accounts_Tasks.findFirst as jest.Mock).mockResolvedValue({ id: "existing" });
    const res = await createAutoTask({
      title: "Cadence 1/5: Call — confirm quote receipt",
      content: "x", accountId: "a1", opportunityId: "o1",
      assigneeId: "u1", dueDateAt: new Date(),
    });
    expect(res).toBeNull();
    expect(prismadb.crm_Accounts_Tasks.create).not.toHaveBeenCalled();
  });

  it("skips when there is no assignee", async () => {
    const res = await createAutoTask({
      title: "T", content: "x", accountId: "a1", opportunityId: "o1",
      assigneeId: null, dueDateAt: new Date(),
    });
    expect(res).toBeNull();
    expect(prismadb.crm_Accounts_Tasks.create).not.toHaveBeenCalled();
  });

  it("still creates the task when the notification email fails", async () => {
    mockSend.mockRejectedValue(new Error("resend down"));
    const res = await createAutoTask({
      title: "T", content: "x", accountId: "a1", opportunityId: "o1",
      assigneeId: "u1", dueDateAt: new Date(),
    });
    expect(res).toEqual({ id: "t1" });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `./node_modules/.bin/jest __tests__/crm/auto-task.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/crm/auto-task.ts`**

```ts
import { prismadb } from "@/lib/prisma";
import { Resend } from "resend";

// Task creation for the funnel timer engine. No session context — the
// assignee is the deal's rep; notification is best-effort.
export async function createAutoTask(opts: {
  title: string;
  content: string;
  accountId: string | null;
  opportunityId?: string | null;
  assigneeId: string | null;
  dueDateAt: Date;
}): Promise<{ id: string } | null> {
  const { title, content, accountId, opportunityId, assigneeId, dueDateAt } = opts;
  if (!assigneeId) return null;

  // Idempotency: one open task per (title, deal) — reruns and overlapping
  // schedules must not duplicate work items.
  const existing = await prismadb.crm_Accounts_Tasks.findFirst({
    where: {
      title,
      taskStatus: { in: ["ACTIVE", "PENDING"] },
      ...(opportunityId ? { opportunity_id: opportunityId } : { account: accountId }),
    },
    select: { id: true },
  });
  if (existing) return null;

  const task = await prismadb.crm_Accounts_Tasks.create({
    data: {
      v: 0,
      title,
      content,
      priority: "high",
      taskStatus: "ACTIVE",
      account: accountId ?? undefined,
      opportunity_id: opportunityId ?? undefined,
      user: assigneeId,
      createdBy: assigneeId,
      updatedBy: assigneeId,
      dueDateAt,
    },
  });

  try {
    const assignee = await prismadb.users.findUnique({ where: { id: assigneeId } });
    if (assignee?.email) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: assignee.email,
        subject: `New task - ${title}`,
        text: `${content}\n\nDue: ${dueDateAt.toDateString()}\n${process.env.NEXT_PUBLIC_APP_URL}/crm/tasks/viewtask/${task.id}`,
      });
    }
  } catch (error) {
    console.error("[createAutoTask] notification failed:", error);
  }

  return { id: task.id };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `./node_modules/.bin/jest __tests__/crm/auto-task.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Implement `inngest/functions/crm/qualified-cadence.ts`**

```ts
import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { cadenceSchedule } from "@/lib/crm/funnel-timers";
import { getFunnelSettings } from "@/lib/crm/funnel-settings";
import { createAutoTask } from "@/lib/crm/auto-task";

// Spec §3.5: 5-touch follow-up cadence after the quote goes out (entry into
// the stage whose stage_kind is "qualified"). A later stage change on the
// same deal cancels the remaining touches via cancelOn; each touch also
// re-checks the deal before creating its task (belt and suspenders).
export const qualifiedCadence = inngest.createFunction(
  {
    id: "crm-qualified-cadence",
    name: "CRM: Qualified follow-up cadence",
    triggers: [{ event: "crm/opportunity.stage-changed" }],
    cancelOn: [{ event: "crm/opportunity.stage-changed", match: "data.record_id" }],
  },
  async ({ event, step }) => {
    const { record_id, to_stage } = event.data as { record_id: string; to_stage: string };

    const stage = await step.run("load-stage", async () => {
      return prismadb.crm_Opportunities_Sales_Stages.findUnique({
        where: { id: to_stage },
        select: { stage_kind: true },
      });
    });
    if (stage?.stage_kind !== "qualified") return { skipped: true, reason: "not a qualified stage" };

    // Instance settings at entry time — later changes affect future entries.
    const settings = await step.run("load-settings", async () => getFunnelSettings());
    const entry = new Date(event.ts ?? Date.now());
    const touches = cadenceSchedule(entry, settings);
    let created = 0;

    for (const touch of touches) {
      await step.sleepUntil(`wait-touch-${touch.touch}`, touch.date);
      const result = await step.run(`create-touch-${touch.touch}`, async () => {
        const opp = await prismadb.crm_Opportunities.findUnique({
          where: { id: record_id },
          select: {
            status: true, sales_stage: true, account: true, assigned_to: true, name: true,
            assigned_sales_stage: { select: { stage_kind: true } },
          },
        });
        if (!opp || opp.status !== "ACTIVE") return null;
        if (opp.assigned_sales_stage?.stage_kind !== "qualified") return null;
        return createAutoTask({
          title: touch.title,
          content: `${touch.content}\nDeal: ${opp.name ?? record_id}`,
          accountId: opp.account,
          opportunityId: record_id,
          assigneeId: opp.assigned_to,
          dueDateAt: touch.date,
        });
      });
      if (result) created += 1;
    }
    return { created };
  }
);
```

- [ ] **Step 6: Register in `app/api/inngest/route.ts`**

Add `import { qualifiedCadence } from "@/inngest/functions/crm/qualified-cadence";` and add `qualifiedCadence,` to the `functions` array.

- [ ] **Step 7: Typecheck + full suite, commit**

Run: `pnpm exec tsc --noEmit && ./node_modules/.bin/jest --ci --testPathIgnorePatterns "__tests__/invoices/lifecycle"`
Expected: clean / all pass.

```bash
git add lib/crm/auto-task.ts __tests__/crm/auto-task.test.ts inngest/functions/crm/qualified-cadence.ts app/api/inngest/route.ts
git commit -m "feat(crm): auto-task helper and 5-touch qualified follow-up cadence"
```

---

### Task 5: 45-day kill rule (daily cron)

**Files:**
- Create: `lib/crm/client-activity.ts`
- Create: `inngest/functions/crm/kill-rule.ts`
- Modify: `app/api/inngest/route.ts` (register)
- Test: `__tests__/crm/client-activity.test.ts`

**Interfaces:**
- Consumes: `resolveLastClientActivity`, `isKillDue` (Task 3); `stage_entered_at` (Task 1); Email model links (`EmailsToContacts`/`EmailsToAccounts`, `folder: "INBOX"`, `sentAt`); `crm_Activities` via `crm_ActivityLinks` (`entityType: "opportunity"`).
- Produces: `getLastClientActivity(opp: { id: string; contact: string | null; account: string | null; stage_entered_at: Date | null }): Promise<Date | null>` in `lib/crm/client-activity.ts` — queries latest inbound email for the deal's contact/account and latest linked activity, then delegates to `resolveLastClientActivity`.

- [ ] **Step 1: Write the failing test**

Create `__tests__/crm/client-activity.test.ts`:

```ts
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    email: { findFirst: jest.fn() },
    crm_Activities: { findFirst: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { getLastClientActivity } from "@/lib/crm/client-activity";

describe("getLastClientActivity", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns the max of stage entry, inbound email, and logged activity", async () => {
    (prismadb.email.findFirst as jest.Mock).mockResolvedValue({
      sentAt: new Date("2026-06-10"),
    });
    (prismadb.crm_Activities.findFirst as jest.Mock).mockResolvedValue({
      date: new Date("2026-06-20"),
    });
    const res = await getLastClientActivity({
      id: "o1", contact: "c1", account: "a1",
      stage_entered_at: new Date("2026-05-01"),
    });
    expect(res).toEqual(new Date("2026-06-20"));
  });

  it("queries inbound emails only, scoped to the deal's contact/account", async () => {
    (prismadb.email.findFirst as jest.Mock).mockResolvedValue(null);
    (prismadb.crm_Activities.findFirst as jest.Mock).mockResolvedValue(null);
    await getLastClientActivity({
      id: "o1", contact: "c1", account: "a1", stage_entered_at: null,
    });
    const where = (prismadb.email.findFirst as jest.Mock).mock.calls[0][0].where;
    expect(where.folder).toBe("INBOX");
    expect(where.OR).toEqual([
      { contacts: { some: { contactId: "c1" } } },
      { accounts: { some: { accountId: "a1" } } },
    ]);
  });

  it("skips the email query entirely when the deal has no contact and no account", async () => {
    (prismadb.crm_Activities.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await getLastClientActivity({
      id: "o1", contact: null, account: null,
      stage_entered_at: new Date("2026-05-01"),
    });
    expect(prismadb.email.findFirst).not.toHaveBeenCalled();
    expect(res).toEqual(new Date("2026-05-01"));
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `./node_modules/.bin/jest __tests__/crm/client-activity.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/crm/client-activity.ts`**

```ts
import { prismadb } from "@/lib/prisma";
import { resolveLastClientActivity } from "./funnel-timers";

// "Client activity" per the 2026-07-18 decision: an inbound synced email
// linked to the deal's contact or account, OR a logged crm_Activities
// entry linked to the opportunity. Stage entry is the clock's floor.
export async function getLastClientActivity(opp: {
  id: string;
  contact: string | null;
  account: string | null;
  stage_entered_at: Date | null;
}): Promise<Date | null> {
  const orScopes = [
    ...(opp.contact ? [{ contacts: { some: { contactId: opp.contact } } }] : []),
    ...(opp.account ? [{ accounts: { some: { accountId: opp.account } } }] : []),
  ];

  const lastInbound = orScopes.length
    ? await prismadb.email.findFirst({
        where: { folder: "INBOX", isDeleted: false, sentAt: { not: null }, OR: orScopes },
        orderBy: { sentAt: "desc" },
        select: { sentAt: true },
      })
    : null;

  const lastActivity = await prismadb.crm_Activities.findFirst({
    where: {
      deletedAt: null,
      links: { some: { entityType: "opportunity", entityId: opp.id } },
    },
    orderBy: { date: "desc" },
    select: { date: true },
  });

  return resolveLastClientActivity({
    stageEnteredAt: opp.stage_entered_at,
    lastInboundEmailAt: lastInbound?.sentAt ?? null,
    lastLoggedActivityAt: lastActivity?.date ?? null,
  });
}
```

- [ ] **Step 4: Run to verify pass**

Run: `./node_modules/.bin/jest __tests__/crm/client-activity.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Implement `inngest/functions/crm/kill-rule.ts`**

```ts
import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { Resend } from "resend";
import { isKillDue } from "@/lib/crm/funnel-timers";
import { getFunnelSettings } from "@/lib/crm/funnel-settings";
import { getLastClientActivity } from "@/lib/crm/client-activity";
import { writeAuditLog } from "@/lib/audit-log";

// Spec §3.5 kill rule: 45 days of client silence on a Qualified deal ->
// Lost (status CLOSED per the 2026-07-18 decision) + rep notification.
// Daily sweep; the clock derives from getLastClientActivity, so any
// inbound email or logged activity restarts it automatically.
export const killRule = inngest.createFunction(
  {
    id: "crm-kill-rule",
    name: "CRM: 45-day kill rule",
    triggers: [{ cron: "0 6 * * *" }],
  },
  async ({ step }) => {
    const settings = await step.run("load-settings", async () => getFunnelSettings());
    const candidates = await step.run("find-qualified-deals", async () => {
      return prismadb.crm_Opportunities.findMany({
        where: {
          status: "ACTIVE",
          deletedAt: null,
          assigned_sales_stage: { stage_kind: "qualified" },
        },
        select: {
          id: true, name: true, contact: true, account: true,
          stage_entered_at: true, assigned_to: true,
        },
        take: 500,
      });
    });

    let closed = 0;
    for (const opp of candidates) {
      const didClose = await step.run(`check-${opp.id}`, async () => {
        const last = await getLastClientActivity(opp);
        if (!isKillDue(last, new Date(), settings)) return false;

        await prismadb.crm_Opportunities.update({
          where: { id: opp.id },
          data: { status: "CLOSED", updatedBy: opp.assigned_to ?? undefined },
        });
        if (opp.assigned_to) {
          await writeAuditLog({
            entityType: "opportunity",
            entityId: opp.id,
            action: "updated",
            changes: { status: { from: "ACTIVE", to: "CLOSED" }, reason: "45-day kill rule" },
            userId: opp.assigned_to,
          });
          const rep = await prismadb.users.findUnique({ where: { id: opp.assigned_to } });
          if (rep?.email) {
            try {
              const resend = new Resend(process.env.RESEND_API_KEY);
              await resend.emails.send({
                from: process.env.RESEND_FROM_EMAIL!,
                to: rep.email,
                subject: `Deal closed by ${settings.killAfterDays}-day rule: ${opp.name ?? opp.id}`,
                text: `The deal "${opp.name ?? opp.id}" had no client activity for ${settings.killAfterDays} days and was closed as Lost.\nReopen it if this is wrong: ${process.env.NEXT_PUBLIC_APP_URL}/crm/opportunities/${opp.id}`,
              });
            } catch (error) {
              console.error("[killRule] notification failed:", error);
            }
          }
        }
        return true;
      });
      if (didClose) closed += 1;
    }
    return { checked: candidates.length, closed };
  }
);
```

- [ ] **Step 6: Register, typecheck, full suite, commit**

Register `killRule` in `app/api/inngest/route.ts`.

Run: `pnpm exec tsc --noEmit && ./node_modules/.bin/jest --ci --testPathIgnorePatterns "__tests__/invoices/lifecycle"`
Expected: clean / all pass. (If `writeAuditLog`'s signature differs from this call shape, adapt the call — read `lib/audit-log.ts` — and note it in your report.)

```bash
git add lib/crm/client-activity.ts __tests__/crm/client-activity.test.ts inngest/functions/crm/kill-rule.ts app/api/inngest/route.ts
git commit -m "feat(crm): 45-day kill rule cron with inbound-email/activity clock"
```

---

### Task 6: Care task engine (event-driven)

**Files:**
- Create: `inngest/functions/crm/care-tasks.ts`
- Modify: `app/api/inngest/route.ts` (register)

**Interfaces:**
- Consumes: `careSchedule` (Task 3), `createAutoTask` (Task 4), `crm/opportunity.stage-changed` event, `stage_kind === "care"`.
- Produces: nothing consumed later; mirrors Task 4's structure exactly (guard → sleepUntil loop → re-check → createAutoTask, `cancelOn` match on `data.record_id`).

- [ ] **Step 1: Implement `inngest/functions/crm/care-tasks.ts`**

```ts
import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { careSchedule } from "@/lib/crm/funnel-timers";
import { getFunnelSettings } from "@/lib/crm/funnel-settings";
import { createAutoTask } from "@/lib/crm/auto-task";

// Spec §3.8: post-delivery Care touchpoints — +30d check-in, ~90d referral
// ask, then quarterly (bounded at 8 quarters). Cancelled automatically if
// the deal changes stage again; each entry re-checks the deal first.
export const careTasks = inngest.createFunction(
  {
    id: "crm-care-tasks",
    name: "CRM: Care touchpoints",
    triggers: [{ event: "crm/opportunity.stage-changed" }],
    cancelOn: [{ event: "crm/opportunity.stage-changed", match: "data.record_id" }],
  },
  async ({ event, step }) => {
    const { record_id, to_stage } = event.data as { record_id: string; to_stage: string };

    const stage = await step.run("load-stage", async () => {
      return prismadb.crm_Opportunities_Sales_Stages.findUnique({
        where: { id: to_stage },
        select: { stage_kind: true },
      });
    });
    if (stage?.stage_kind !== "care") return { skipped: true, reason: "not a care stage" };

    const settings = await step.run("load-settings", async () => getFunnelSettings());
    const entries = careSchedule(new Date(event.ts ?? Date.now()), settings);
    let created = 0;

    for (const [i, entry] of entries.entries()) {
      await step.sleepUntil(`wait-care-${i}`, entry.date);
      const result = await step.run(`create-care-${i}`, async () => {
        const opp = await prismadb.crm_Opportunities.findUnique({
          where: { id: record_id },
          select: {
            status: true, account: true, assigned_to: true, name: true,
            assigned_sales_stage: { select: { stage_kind: true } },
          },
        });
        if (!opp || opp.status !== "ACTIVE") return null;
        if (opp.assigned_sales_stage?.stage_kind !== "care") return null;
        return createAutoTask({
          title: entry.title,
          content: `${entry.content}\nClient: ${opp.name ?? record_id}`,
          accountId: opp.account,
          opportunityId: record_id,
          assigneeId: opp.assigned_to,
          dueDateAt: entry.date,
        });
      });
      if (result) created += 1;
    }
    return { created };
  }
);
```

- [ ] **Step 2: Register, typecheck, full suite, commit**

Register `careTasks` in `app/api/inngest/route.ts`.

Run: `pnpm exec tsc --noEmit && ./node_modules/.bin/jest --ci --testPathIgnorePatterns "__tests__/invoices/lifecycle"`
Expected: clean / all pass. (The scheduling/creation logic is covered by Task 3's and Task 4's unit tests; this function is thin wiring by design.)

```bash
git add inngest/functions/crm/care-tasks.ts app/api/inngest/route.ts
git commit -m "feat(crm): care touchpoint engine (+30d, referral, quarterly)"
```

---

### Task 7: 3-month target recycle (daily cron)

**Files:**
- Create: `lib/crm/recycle.ts`
- Create: `inngest/functions/crm/recycle-targets.ts`
- Modify: `app/api/inngest/route.ts` (register)
- Test: `__tests__/crm/recycle.test.ts`

**Interfaces:**
- Consumes: campaign send/step shapes (`crm_campaign_sends.sent_at/status/step.order`, `crm_campaign_steps.order` unique per campaign), `crm_Targets.do_not_email/converted_at`, `crm_TargetLists`/`TargetsToTargetLists`.
- Produces: `findRecycleCandidates(now: Date, s: FunnelTimingSettings = DEFAULT_FUNNEL_SETTINGS): Promise<string[]>` in `lib/crm/recycle.ts` — target ids whose campaign sequence finished ≥ `s.recycleAfterDays` days ago, not converted, not suppressed, not already in the "Recycled" list. `RECYCLED_LIST_NAME = "Recycled"` exported constant.

- [ ] **Step 1: Write the failing test**

Create `__tests__/crm/recycle.test.ts`:

```ts
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_campaign_sends: { findMany: jest.fn() },
    crm_campaign_steps: { groupBy: jest.fn() },
    crm_Targets: { findMany: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { findRecycleCandidates } from "@/lib/crm/recycle";

const DAY = 24 * 60 * 60 * 1000;
const now = new Date("2026-07-18T00:00:00Z");
const old = new Date(now.getTime() - 100 * DAY); // > 90 days ago
const recent = new Date(now.getTime() - 10 * DAY);

describe("findRecycleCandidates", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns targets whose final step was sent 90+ days ago", async () => {
    (prismadb.crm_campaign_steps.groupBy as jest.Mock).mockResolvedValue([
      { campaign_id: "camp1", _max: { order: 3 } },
    ]);
    (prismadb.crm_campaign_sends.findMany as jest.Mock).mockResolvedValue([
      // t-done finished the sequence long ago; t-fresh finished recently;
      // t-mid never got the last step
      { target_id: "t-done", campaign_id: "camp1", sent_at: old, step: { order: 3 } },
      { target_id: "t-fresh", campaign_id: "camp1", sent_at: recent, step: { order: 3 } },
      { target_id: "t-mid", campaign_id: "camp1", sent_at: old, step: { order: 1 } },
    ]);
    (prismadb.crm_Targets.findMany as jest.Mock).mockResolvedValue([
      { id: "t-done" }, // survives the eligibility filter
    ]);

    const ids = await findRecycleCandidates(now);
    expect(ids).toEqual(["t-done"]);

    // Eligibility filter excludes converted/suppressed/already-recycled targets
    const where = (prismadb.crm_Targets.findMany as jest.Mock).mock.calls[0][0].where;
    expect(where.id.in).toEqual(["t-done"]);
    expect(where.do_not_email).toBe(false);
    expect(where.converted_at).toBeNull();
    expect(where.deletedAt).toBeNull();
    expect(where.target_lists.none.target_list.name).toBe("Recycled");
  });

  it("returns [] when no sequence has finished", async () => {
    (prismadb.crm_campaign_steps.groupBy as jest.Mock).mockResolvedValue([]);
    (prismadb.crm_campaign_sends.findMany as jest.Mock).mockResolvedValue([]);
    const ids = await findRecycleCandidates(now);
    expect(ids).toEqual([]);
    expect(prismadb.crm_Targets.findMany).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `./node_modules/.bin/jest __tests__/crm/recycle.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/crm/recycle.ts`**

```ts
import { prismadb } from "@/lib/prisma";
import {
  DEFAULT_FUNNEL_SETTINGS,
  type FunnelTimingSettings,
} from "./funnel-timers";

export const RECYCLED_LIST_NAME = "Recycled";
const DAY = 24 * 60 * 60 * 1000;

// Spec §3.3: a target whose sequence finished with no response is paused
// (recycleAfterDays, default 90), then recycled. "Sequence finished" = the
// campaign's max-order step was sent to the target; "no response" = never
// converted (an inbound reply leads to conversion in the runbook flow).
export async function findRecycleCandidates(
  now: Date,
  s: FunnelTimingSettings = DEFAULT_FUNNEL_SETTINGS,
): Promise<string[]> {
  const cutoff = new Date(now.getTime() - s.recycleAfterDays * DAY);

  const maxOrders = await prismadb.crm_campaign_steps.groupBy({
    by: ["campaign_id"],
    _max: { order: true },
  });
  const maxOrderByCampaign = new Map(
    maxOrders.map((m) => [m.campaign_id, m._max.order ?? 0]),
  );
  if (maxOrderByCampaign.size === 0) return [];

  const finalSends = await prismadb.crm_campaign_sends.findMany({
    where: { status: "sent", sent_at: { lte: cutoff } },
    select: { target_id: true, campaign_id: true, sent_at: true, step: { select: { order: true } } },
  });

  const finishedTargetIds = [
    ...new Set(
      finalSends
        .filter((s) => s.step.order === maxOrderByCampaign.get(s.campaign_id))
        .map((s) => s.target_id),
    ),
  ];
  if (finishedTargetIds.length === 0) return [];

  const eligible = await prismadb.crm_Targets.findMany({
    where: {
      id: { in: finishedTargetIds },
      do_not_email: false,
      converted_at: null,
      deletedAt: null,
      target_lists: { none: { target_list: { name: RECYCLED_LIST_NAME } } },
    },
    select: { id: true },
  });
  return eligible.map((t) => t.id);
}
```

- [ ] **Step 4: Run to verify pass**

Run: `./node_modules/.bin/jest __tests__/crm/recycle.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Implement `inngest/functions/crm/recycle-targets.ts`**

```ts
import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { Resend } from "resend";
import { findRecycleCandidates, RECYCLED_LIST_NAME } from "@/lib/crm/recycle";
import { getFunnelSettings } from "@/lib/crm/funnel-settings";

// Documented deviation from spec §3.3 ("automatically re-tried with a
// sequence"): campaign sends are unique per (step, target), so re-running
// the same campaign is a no-op by design. Instead, recycled targets land
// in the "Recycled" list and admins get a digest — a human assigns the
// recycle batch to a fresh campaign.
export const recycleTargets = inngest.createFunction(
  {
    id: "crm-recycle-targets",
    name: "CRM: Recycle exhausted targets",
    triggers: [{ cron: "30 6 * * *" }],
  },
  async ({ step }) => {
    const candidateIds = await step.run("find-candidates", async () => {
      return findRecycleCandidates(new Date(), await getFunnelSettings());
    });
    if (candidateIds.length === 0) return { recycled: 0 };

    const listId = await step.run("ensure-recycled-list", async () => {
      const existing = await prismadb.crm_TargetLists.findFirst({
        where: { name: RECYCLED_LIST_NAME, deletedAt: null },
      });
      if (existing) return existing.id;
      const created = await prismadb.crm_TargetLists.create({
        data: {
          name: RECYCLED_LIST_NAME,
          description: "Auto-managed: targets whose sequence finished 90+ days ago with no response.",
        },
      });
      return created.id;
    });

    await step.run("add-to-list", async () => {
      await prismadb.targetsToTargetLists.createMany({
        data: candidateIds.map((target_id) => ({ target_id, target_list_id: listId })),
        skipDuplicates: true,
      });
    });

    await step.run("notify-admins", async () => {
      const admins = await prismadb.users.findMany({
        where: { role: "admin", userStatus: "ACTIVE" },
        select: { email: true },
      });
      const to = admins.map((a) => a.email).filter(Boolean) as string[];
      if (to.length === 0) return;
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL!,
          to,
          subject: `${candidateIds.length} targets recycled — assign a new sequence`,
          text: `${candidateIds.length} targets finished their sequence 90+ days ago with no response and were added to the "${RECYCLED_LIST_NAME}" target list.\nAssign the list to a fresh campaign: ${process.env.NEXT_PUBLIC_APP_URL}/campaigns/target-lists`,
        });
      } catch (error) {
        console.error("[recycleTargets] digest failed:", error);
      }
    });

    return { recycled: candidateIds.length };
  }
);
```

- [ ] **Step 6: Register, typecheck, full suite, commit**

Register `recycleTargets` in `app/api/inngest/route.ts`. Verify the join-table client accessor name (`prismadb.targetsToTargetLists`) against the generated client — Prisma lowercases the first letter of `TargetsToTargetLists`; adjust if the generated name differs.

Run: `pnpm exec tsc --noEmit && ./node_modules/.bin/jest --ci --testPathIgnorePatterns "__tests__/invoices/lifecycle"`
Expected: clean / all pass.

```bash
git add lib/crm/recycle.ts __tests__/crm/recycle.test.ts inngest/functions/crm/recycle-targets.ts app/api/inngest/route.ts
git commit -m "feat(crm): 3-month target recycle cron with Recycled list and admin digest"
```

---

### Task 8: Renewal surfacing (weekly cron)

**Files:**
- Create: `inngest/functions/crm/renewal-reminders.ts`
- Modify: `app/api/inngest/route.ts` (register)

**Interfaces:**
- Consumes: `renewalWindowEnd` (Task 3), `createAutoTask` (Task 4, provides title-based idempotency so the weekly re-run cannot duplicate open tasks), `crm_Contracts.renewalReminderDate`, `crm_AccountProducts.renewal_date`.
- Produces: nothing consumed later.

- [ ] **Step 1: Implement `inngest/functions/crm/renewal-reminders.ts`**

```ts
import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { renewalWindowEnd } from "@/lib/crm/funnel-timers";
import { getFunnelSettings } from "@/lib/crm/funnel-settings";
import { createAutoTask } from "@/lib/crm/auto-task";

// Spec §3.8: "renewals surface automatically". Weekly sweep over contract
// renewal reminders and account-product renewal dates in the next 30 days;
// createAutoTask's title-based idempotency makes re-runs safe.
export const renewalReminders = inngest.createFunction(
  {
    id: "crm-renewal-reminders",
    name: "CRM: Renewal reminders",
    triggers: [{ cron: "0 7 * * 1" }],
  },
  async ({ step }) => {
    const now = new Date();
    const settings = await step.run("load-settings", async () => getFunnelSettings());
    const windowEnd = renewalWindowEnd(now, settings);
    let created = 0;

    const contracts = await step.run("find-contract-renewals", async () => {
      return prismadb.crm_Contracts.findMany({
        where: {
          deletedAt: null,
          renewalReminderDate: { gte: now, lte: windowEnd },
        },
        select: { id: true, title: true, account: true, assigned_to: true, renewalReminderDate: true },
      });
    });
    for (const c of contracts) {
      const result = await step.run(`contract-${c.id}`, async () => {
        return createAutoTask({
          title: `Renewal: contract "${c.title}"`,
          content: `Contract renewal reminder date is ${c.renewalReminderDate?.toDateString()}. Reach out about renewal terms.\n${process.env.NEXT_PUBLIC_APP_URL}/crm/contracts/${c.id}`,
          accountId: c.account,
          assigneeId: c.assigned_to,
          dueDateAt: c.renewalReminderDate ?? now,
        });
      });
      if (result) created += 1;
    }

    const products = await step.run("find-product-renewals", async () => {
      return prismadb.crm_AccountProducts.findMany({
        where: {
          status: "ACTIVE",
          renewal_date: { gte: now, lte: windowEnd },
        },
        select: {
          id: true, renewal_date: true, account_id: true,
          account: { select: { assigned_to: true, name: true } },
          product: { select: { name: true } },
        },
      });
    });
    for (const p of products) {
      const result = await step.run(`product-${p.id}`, async () => {
        return createAutoTask({
          title: `Renewal: ${p.product?.name ?? "product"} @ ${p.account?.name ?? p.account_id}`,
          content: `Product subscription renews on ${p.renewal_date?.toDateString()}. Confirm renewal with the client.`,
          accountId: p.account_id,
          assigneeId: p.account?.assigned_to ?? null,
          dueDateAt: p.renewal_date ?? now,
        });
      });
      if (result) created += 1;
    }

    return { created };
  }
);
```

Field-name caveat: verify `crm_AccountProducts`' exact relation/field names (`account_id`, `account`, `product`) against the schema before relying on this select — adapt the select if they differ and note it in your report.

- [ ] **Step 2: Register, typecheck, full suite, commit**

Register `renewalReminders` in `app/api/inngest/route.ts`.

Run: `pnpm exec tsc --noEmit && ./node_modules/.bin/jest --ci --testPathIgnorePatterns "__tests__/invoices/lifecycle"`
Expected: clean / all pass.

```bash
git add inngest/functions/crm/renewal-reminders.ts app/api/inngest/route.ts
git commit -m "feat(crm): weekly renewal reminder sweep for contracts and account products"
```

---

### Task 9: Admin UI — connect stage kinds in CRM settings

**Files:**
- Modify: `app/[locale]/(routes)/admin/crm-settings/_actions/crm-settings.ts`
- Modify: `app/[locale]/(routes)/admin/crm-settings/` components (`ConfigList.tsx`, the Add/Edit dialogs, `page.tsx`/`CrmSettingsTabs.tsx` as needed — read them first; exact file names per the existing structure)
- Test: extend `__tests__/crm-settings-actions.test.ts`

**Interfaces:**
- Consumes: `stage_kind` column (Task 1).
- Produces: `ConfigValue` gains `stageKind?: string | null`; `createConfigValue(configType, name, stageKind?)` and `updateConfigValue(configType, id, name, stageKind?)` persist it for `configType === "salesStage"` only (ignored otherwise). `STAGE_KINDS` exported from the actions file: `["pre_sale","qualified","purchase_order","delivery","care"] as const`.

- [ ] **Step 1: Write the failing tests**

Extend `__tests__/crm-settings-actions.test.ts` (match its existing mock style — it mocks the prisma models per config type) with:

```ts
  it("creates a sales stage with a stage kind", async () => {
    (mockPrisma.crm_Opportunities_Sales_Stages.create as jest.Mock).mockResolvedValue({});
    await createConfigValue("salesStage", "Qualified Lead", "qualified");
    expect(mockPrisma.crm_Opportunities_Sales_Stages.create).toHaveBeenCalledWith({
      data: { name: "Qualified Lead", v: 0, stage_kind: "qualified" },
    });
  });

  it("ignores stageKind for non-salesStage types", async () => {
    (mockPrisma.crm_Contact_Types.create as jest.Mock).mockResolvedValue({});
    await createConfigValue("contactType", "Investor", "qualified");
    expect(mockPrisma.crm_Contact_Types.create).toHaveBeenCalledWith({
      data: { name: "Investor", v: 0 },
    });
  });

  it("updates a sales stage kind (null clears it)", async () => {
    (mockPrisma.crm_Opportunities_Sales_Stages.update as jest.Mock).mockResolvedValue({});
    await updateConfigValue("salesStage", "id-1", "Qualified Lead", null);
    expect(mockPrisma.crm_Opportunities_Sales_Stages.update).toHaveBeenCalledWith({
      where: { id: "id-1" },
      data: { name: "Qualified Lead", stage_kind: null },
    });
  });

  it("rejects an invalid stage kind", async () => {
    await expect(
      createConfigValue("salesStage", "X", "bogus" as any),
    ).rejects.toThrow();
  });
```

If the existing test file mocks only some models, add `crm_Opportunities_Sales_Stages: { create: jest.fn(), update: jest.fn(), findMany: jest.fn() }` to its prisma mock.

- [ ] **Step 2: Run to verify failure**

Run: `./node_modules/.bin/jest __tests__/crm-settings-actions.test.ts`
Expected: the new tests FAIL (extra argument ignored / wrong create payload).

- [ ] **Step 3: Extend the actions**

In `_actions/crm-settings.ts`:

1. Export the kinds and a zod validator:

```ts
export const STAGE_KINDS = ["pre_sale", "qualified", "purchase_order", "delivery", "care"] as const;
export type StageKind = (typeof STAGE_KINDS)[number];
const stageKindSchema = z.enum(STAGE_KINDS).nullable().optional();
```

2. Extend `ConfigValue` with `stageKind?: string | null`; in `getConfigValues`, when `configType === "salesStage"`, select `stage_kind` and map it to `stageKind` in the returned objects.

3. Change signatures to `createConfigValue(configType: CrmConfigType, name: string, stageKind?: StageKind | null)` and `updateConfigValue(configType: CrmConfigType, id: string, name: string, stageKind?: StageKind | null)`. In both, when `configType === "salesStage"`, validate via `stageKindSchema.parse(stageKind)` and include `stage_kind: <validated value>` in the create/update `data` **only when the argument was provided** (create: include when defined; update: include when the argument was passed, so `null` clears it). Other config types ignore the parameter entirely.

- [ ] **Step 4: Run to verify pass**

Run: `./node_modules/.bin/jest __tests__/crm-settings-actions.test.ts`
Expected: all PASS (old + new).

- [ ] **Step 5: Extend the UI**

Read the crm-settings components first. Then, for the `salesStage` tab only:

- `page.tsx` already passes `values` (now carrying `stageKind`) through `CrmSettingsTabs` → `ConfigList` — thread the field through any intermediate prop types.
- In `ConfigList.tsx`, next to each sales-stage row's name, render the kind as a Badge when set: `{item.stageKind && <Badge variant="outline">{item.stageKind}</Badge>}`.
- In the Add and Edit dialogs (for `configType === "salesStage"` only), add a shadcn `Select` labeled "Automation trigger" with items: `None` (value clears to null) plus the five `STAGE_KINDS` (render the raw value; no i18n keys — matches the admin section's existing literal-string style). Pass the selection through to `createConfigValue`/`updateConfigValue` as the new third/fourth argument.

Keep the dialogs' existing name-field behavior untouched for all other config types.

- [ ] **Step 6: Typecheck, full suite, e2e smoke, commit**

Run: `pnpm exec tsc --noEmit && ./node_modules/.bin/jest --ci --testPathIgnorePatterns "__tests__/invoices/lifecycle"`
Expected: clean / all pass. Also run the e2e reports/crm specs locally if the dev DB is reachable: `pnpm exec playwright test tests/e2e/crm.spec.ts --project=chromium` (settings UI changes must not break existing flows).

```bash
git add "app/[locale]/(routes)/admin/crm-settings" __tests__/crm-settings-actions.test.ts
git commit -m "feat(admin): connect automation trigger kinds to sales stages in CRM settings"
```

---

### Task 10: Admin UI — Funnel settings page (instance-grade timing)

**Files:**
- Create: `app/[locale]/(routes)/admin/funnel-settings/page.tsx`
- Create: `app/[locale]/(routes)/admin/funnel-settings/_actions/funnel-settings.ts`
- Create: `app/[locale]/(routes)/admin/funnel-settings/_components/FunnelSettingsForm.tsx`
- Modify: the admin section's navigation (find how `admin/crm-settings` is linked — grep `crm-settings` in `app/[locale]/(routes)/admin/` and the sidebar/module-menu components — and add an equivalent "Funnel settings" link)
- Test: `__tests__/crm/funnel-settings-actions.test.ts`

**Interfaces:**
- Consumes: `crm_FunnelSettings` model (Task 1), `FunnelTimingSettings`/`DEFAULT_FUNNEL_SETTINGS` (Task 3), `getFunnelSettings` (Task 3).
- Produces: `updateFunnelSettings(values: FunnelTimingSettings): Promise<{ error?: string }>` server action — admin-gated (`requireRole(["admin"])`), zod-validated (each field an integer 1–365; `careQuarterCount` 0–24), upserts the singleton row (update the first row if it exists, else create), `revalidatePath` on the admin page.

- [ ] **Step 1: Write the failing test**

Create `__tests__/crm/funnel-settings-actions.test.ts`:

```ts
jest.mock("@/lib/authz", () => ({
  requireRole: jest.fn(),
  AuthorizationError: class AuthorizationError extends Error {},
  AuthenticationError: class AuthenticationError extends Error {},
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_FunnelSettings: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

import { prismadb } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { DEFAULT_FUNNEL_SETTINGS } from "@/lib/crm/funnel-timers";
import { updateFunnelSettings } from "@/app/[locale]/(routes)/admin/funnel-settings/_actions/funnel-settings";

describe("updateFunnelSettings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireRole as jest.Mock).mockResolvedValue({ id: "admin1", role: "admin" });
  });

  it("creates the singleton row on first save", async () => {
    (prismadb.crm_FunnelSettings.findFirst as jest.Mock).mockResolvedValue(null);
    (prismadb.crm_FunnelSettings.create as jest.Mock).mockResolvedValue({});
    const res = await updateFunnelSettings({ ...DEFAULT_FUNNEL_SETTINGS, killAfterDays: 30 });
    expect(res).toEqual({});
    const data = (prismadb.crm_FunnelSettings.create as jest.Mock).mock.calls[0][0].data;
    expect(data.kill_after_days).toBe(30);
    expect(data.recycle_after_days).toBe(90);
    expect(data.updatedBy).toBe("admin1");
  });

  it("updates the existing singleton row", async () => {
    (prismadb.crm_FunnelSettings.findFirst as jest.Mock).mockResolvedValue({ id: "row1" });
    (prismadb.crm_FunnelSettings.update as jest.Mock).mockResolvedValue({});
    await updateFunnelSettings({ ...DEFAULT_FUNNEL_SETTINGS, renewalWindowDays: 14 });
    const call = (prismadb.crm_FunnelSettings.update as jest.Mock).mock.calls[0][0];
    expect(call.where).toEqual({ id: "row1" });
    expect(call.data.renewal_window_days).toBe(14);
  });

  it("rejects out-of-range values", async () => {
    const res = await updateFunnelSettings({ ...DEFAULT_FUNNEL_SETTINGS, killAfterDays: 0 });
    expect(res.error).toBeDefined();
    expect(prismadb.crm_FunnelSettings.create).not.toHaveBeenCalled();
  });

  it("returns error for non-admins", async () => {
    const { AuthorizationError } = jest.requireMock("@/lib/authz");
    (requireRole as jest.Mock).mockRejectedValue(new AuthorizationError());
    const res = await updateFunnelSettings(DEFAULT_FUNNEL_SETTINGS);
    expect(res.error).toBeDefined();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `./node_modules/.bin/jest __tests__/crm/funnel-settings-actions.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `_actions/funnel-settings.ts`**

```ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prismadb } from "@/lib/prisma";
import { requireRole, AuthorizationError, AuthenticationError } from "@/lib/authz";
import type { FunnelTimingSettings } from "@/lib/crm/funnel-timers";

const dayField = z.number().int().min(1).max(365);
const settingsSchema = z.object({
  killAfterDays: dayField,
  recycleAfterDays: dayField,
  cadenceTouch1BusinessDays: dayField,
  cadenceTouch2OffsetDays: dayField,
  cadenceTouch3OffsetDays: dayField,
  cadenceTouch4OffsetDays: dayField,
  cadenceTouch5OffsetDays: dayField,
  careCheckinDays: dayField,
  careReferralDays: dayField,
  careQuarterIntervalDays: dayField,
  careQuarterCount: z.number().int().min(0).max(24),
  renewalWindowDays: dayField,
});

export async function updateFunnelSettings(
  values: FunnelTimingSettings,
): Promise<{ error?: string }> {
  let admin;
  try {
    admin = await requireRole(["admin"]);
  } catch (e) {
    if (e instanceof AuthorizationError || e instanceof AuthenticationError) {
      return { error: "Forbidden" };
    }
    throw e;
  }

  const parsed = settingsSchema.safeParse(values);
  if (!parsed.success) return { error: "Invalid values — all fields must be whole days in range." };
  const v = parsed.data;

  const data = {
    kill_after_days: v.killAfterDays,
    recycle_after_days: v.recycleAfterDays,
    cadence_touch1_business_days: v.cadenceTouch1BusinessDays,
    cadence_touch2_offset_days: v.cadenceTouch2OffsetDays,
    cadence_touch3_offset_days: v.cadenceTouch3OffsetDays,
    cadence_touch4_offset_days: v.cadenceTouch4OffsetDays,
    cadence_touch5_offset_days: v.cadenceTouch5OffsetDays,
    care_checkin_days: v.careCheckinDays,
    care_referral_days: v.careReferralDays,
    care_quarter_interval_days: v.careQuarterIntervalDays,
    care_quarter_count: v.careQuarterCount,
    renewal_window_days: v.renewalWindowDays,
    updatedBy: admin.id,
  };

  const existing = await prismadb.crm_FunnelSettings.findFirst({ select: { id: true } });
  if (existing) {
    await prismadb.crm_FunnelSettings.update({ where: { id: existing.id }, data });
  } else {
    await prismadb.crm_FunnelSettings.create({ data });
  }
  revalidatePath("/[locale]/(routes)/admin/funnel-settings", "page");
  return {};
}
```

- [ ] **Step 4: Run to verify pass**

Run: `./node_modules/.bin/jest __tests__/crm/funnel-settings-actions.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Build the page + form**

`page.tsx` (server component, mirrors the admin section's existing page style — check `admin/crm-settings/page.tsx` for the guard/layout conventions and reuse them):

```tsx
import { getFunnelSettings } from "@/lib/crm/funnel-settings";
import FunnelSettingsForm from "./_components/FunnelSettingsForm";

const FunnelSettingsPage = async () => {
  const settings = await getFunnelSettings();
  return <FunnelSettingsForm initial={settings} />;
};

export default FunnelSettingsPage;
```

(If the admin section guards per-page rather than via layout, add the same admin guard `admin/crm-settings/page.tsx` uses.)

`_components/FunnelSettingsForm.tsx` — client component: one Card ("Funnel timing — instance settings") with a short explainer line: "Changes apply to future stage entries and the next timer runs; already-scheduled cadences keep the timings they started with." Render a labeled `Input type="number"` per field, grouped into four sections (Kill rule, Recycle, Follow-up cadence, Care & renewals):

```tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FunnelTimingSettings } from "@/lib/crm/funnel-timers";
import { updateFunnelSettings } from "../_actions/funnel-settings";

const FIELDS: Array<{ key: keyof FunnelTimingSettings; label: string; group: string }> = [
  { key: "killAfterDays", label: "Close deal after N days of client silence", group: "Kill rule" },
  { key: "recycleAfterDays", label: "Recycle targets N days after sequence end", group: "Recycle" },
  { key: "cadenceTouch1BusinessDays", label: "Touch 1: business days after quote", group: "Follow-up cadence" },
  { key: "cadenceTouch2OffsetDays", label: "Touch 2: days after touch 1", group: "Follow-up cadence" },
  { key: "cadenceTouch3OffsetDays", label: "Touch 3: days after touch 2", group: "Follow-up cadence" },
  { key: "cadenceTouch4OffsetDays", label: "Touch 4: days after touch 3", group: "Follow-up cadence" },
  { key: "cadenceTouch5OffsetDays", label: "Touch 5 (final): days after touch 3", group: "Follow-up cadence" },
  { key: "careCheckinDays", label: "Care check-in after N days", group: "Care & renewals" },
  { key: "careReferralDays", label: "Referral ask after N days", group: "Care & renewals" },
  { key: "careQuarterIntervalDays", label: "Quarterly interval (days)", group: "Care & renewals" },
  { key: "careQuarterCount", label: "Number of quarterly check-ins", group: "Care & renewals" },
  { key: "renewalWindowDays", label: "Surface renewals N days ahead", group: "Care & renewals" },
];

const FunnelSettingsForm = ({ initial }: { initial: FunnelTimingSettings }) => {
  const [values, setValues] = useState<FunnelTimingSettings>(initial);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await updateFunnelSettings(values);
      if (res.error) toast.error(res.error);
      else toast.success("Funnel settings saved");
    } catch {
      toast.error("Failed to save funnel settings");
    } finally {
      setSaving(false);
    }
  };

  const groups = [...new Set(FIELDS.map((f) => f.group))];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Funnel timing — instance settings</CardTitle>
        <p className="text-sm text-muted-foreground">
          Changes apply to future stage entries and the next timer runs;
          already-scheduled cadences keep the timings they started with.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {groups.map((group) => (
          <div key={group} className="space-y-2">
            <h3 className="text-sm font-semibold">{group}</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {FIELDS.filter((f) => f.group === group).map((f) => (
                <label key={f.key} className="space-y-1 text-sm">
                  <span>{f.label}</span>
                  <Input
                    type="number"
                    min={0}
                    value={values[f.key]}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [f.key]: Number(e.target.value) }))
                    }
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save settings"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default FunnelSettingsForm;
```

Then add the navigation link: grep for how `admin/crm-settings` appears in the admin section's navigation/landing and add a sibling "Funnel settings" entry pointing to `/admin/funnel-settings`.

- [ ] **Step 6: Typecheck, full suite, commit**

Run: `pnpm exec tsc --noEmit && ./node_modules/.bin/jest --ci --testPathIgnorePatterns "__tests__/invoices/lifecycle"`
Expected: clean / all pass.

```bash
git add "app/[locale]/(routes)/admin/funnel-settings" __tests__/crm/funnel-settings-actions.test.ts
git commit -m "feat(admin): instance-grade funnel timing settings page"
```

(Include the navigation file you modified in the `git add`.)

---

### Task 11: Documentation — runbook + roadmap update

**Files:**
- Modify: `docs/internal/aqunama-setup-runbook.md` (add a "Phase 2 automation" section)
- Modify: `docs/superpowers/plans/2026-07-16-aqunama-roadmap.md` (mark Plan 2 as specified/implemented)

- [ ] **Step 1: Append to the runbook**

Add this section to `docs/internal/aqunama-setup-runbook.md`:

```markdown
## 7. Phase 2 automation (timers)

After deploying Phase 2, connect the automation in **Admin → CRM settings →
Sales stage**: each stage has an "Automation trigger" — set Pre-Sale →
pre_sale, Qualified Lead → qualified, Purchase Order → purchase_order,
Delivery → delivery, Care → care. Stages without a trigger are ignored by
the timers (renaming a stage never breaks automation; the trigger does).

All day counts below are the defaults — every one is editable at
**Admin → Funnel settings** (instance-wide; changes apply to future stage
entries and the next timer runs).

What runs automatically:
- **Qualified entry** → 5-touch follow-up cadence as tasks for the deal's
  rep (+3 business days call, +7d email, +10d email/call, day 15 and day
  45 of the retention window). Leaves the stage → remaining touches cancel.
- **45-day kill rule** (daily 06:00 UTC): Qualified deals with no client
  activity (inbound synced email, logged activity) for 45 days are closed
  as Lost and the rep is emailed. Reopen by setting status back to Active.
- **Care entry** → +30d check-in, ~90d referral-ask, then quarterly tasks
  (8 quarters).
- **Recycle** (daily 06:30 UTC): targets whose sequence finished 90+ days
  ago with no conversion land in the "Recycled" target list; admins get a
  digest. Assign that list to a fresh campaign to re-try them.
- **Renewals** (Mondays 07:00 UTC): contract reminder dates and product
  renewal dates within 30 days become tasks for the account's rep.
```

- [ ] **Step 2: Update the roadmap**

In `docs/superpowers/plans/2026-07-16-aqunama-roadmap.md`, change the Plan 2 heading to `## Plan 2 — Timer & Task Engine ✅ specified (2026-07-18)` and add a line: `Full plan: docs/superpowers/plans/2026-07-18-aqunama-p2-timer-task-engine.md — decisions: activity = inbound email OR logged activity; stage kinds connectable in admin; weekend-only business days; kill = close + notify.`

- [ ] **Step 3: Commit**

```bash
git add docs/internal/aqunama-setup-runbook.md docs/superpowers/plans/2026-07-16-aqunama-roadmap.md
git commit -m "docs(internal): Phase 2 automation runbook section"
```

---

## Out of Scope (unchanged from roadmap)

Plan 3 (SOW/quote approval + case-study flag) and Plan 4 (calendar sync). Also deferred: low/high-value deal distinction for cadence mode, automatic re-sequencing of recycled targets, holiday calendars, and a UI surface listing a deal's linked tasks (tasks appear in the existing account task tables; a deal-detail task panel is a follow-up).
