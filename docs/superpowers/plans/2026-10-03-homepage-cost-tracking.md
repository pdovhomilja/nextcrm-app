# Homepage Cost Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin page that shows, per target, the accumulated cost of homepage HTML generation across every regeneration and refine iteration.

**Architecture:** Persist per-pass Anthropic token usage + model onto the existing `crm_Target_Homepage_Version` rows (one row per pass). A pure pricing/aggregation helper turns stored tokens into dollars and per-target summaries. A read-only admin page renders the summaries, sorted newest-first.

**Tech Stack:** Next.js 16 App Router (RSC), Prisma 7 (Postgres), better-auth (`requireRole`), Jest, pnpm.

**Spec:** `docs/superpowers/specs/2026-10-03-homepage-cost-tracking-design.md`

## Global Constraints

- Package manager is **pnpm** only (Node 22). Never npm/yarn.
- **Never `prisma db push`.** Author schema changes with `pnpm exec prisma migrate dev --name <name>`; commit the generated migration folder.
- Import path casing must match filenames exactly (CI is Linux/case-sensitive).
- Admin action must enforce `requireRole(["admin"])` server-side (no RLS in this stack).
- The aggregation query must **never select the `html` column** (large).
- Model id strings are exactly: `claude-sonnet-5-5`, `claude-opus-5-5`, `claude-haiku-4-5-20251001` (the `HOMEPAGE_MODELS` set).
- Pricing (USD per 1M tokens): sonnet-5-5 = in 2.0 / out 10.0 / cacheRead 0.20 / cacheWrite 2.50; opus-5-5 = in 4.0 / out 20.0 / cacheRead 0.20 / cacheWrite 5.0; haiku-4-5 = in 1.0 / out 5.0 / cacheRead 0.10 / cacheWrite 1.25.
- A "generation" = a version with `pass_kind` AUTO or HUMAN. UPLOAD versions are excluded from counts, cost, and last-generation date.

## Review Focus

- **Partial/null usage on a generation pass** (e.g. `output_tokens` null): cost must treat missing fields as 0, never `NaN`. → Task 2 test.
- **Unknown/legacy model id stored on a version**: cost must be 0, not a thrown error. → Task 2 test.
- **Target whose generations all predate tracking (model null) or that has only UPLOAD versions**: appears with 0 cost, correct generation count, a null last-generation date rendered gracefully, and the "pre-tracking" flag. → Task 2 + Task 4 tests.
- **Mixed models across a target's passes**: cost uses each pass's own rate; model column reports the most recent plus a distinct-count annotation. → Task 2 + Task 4 tests.
- **Many versions**: aggregation must not pull `html`. → Task 4 test asserts the `select` shape omits `html`.

---

### Task 1: Schema + migration (usage columns)

**Files:**
- Modify: `prisma/schema.prisma` (model `crm_Target_Homepage_Version`, ~line 2179)
- Create: `prisma/migrations/<timestamp>_homepage_version_usage/migration.sql` (generated)

**Interfaces:**
- Produces: new nullable columns on `crm_Target_Homepage_Version`: `model` (String?), `input_tokens` / `output_tokens` / `cache_read_tokens` / `cache_creation_tokens` (Int?). Prisma field names == column names (snake_case, no `@map`, matching the existing `homepage_id`/`created_at` style).

- [ ] **Step 1: Ensure a local DB is running and `DATABASE_URL` points at it**

Run: `pnpm dlx supabase status` (expect the API/DB on the `546xx` ports). If not running: `pnpm dlx supabase start`. Confirm `DATABASE_URL` resolves to `127.0.0.1` (the `scripts/assert-local-db.sh` guard requires local).

- [ ] **Step 2: Add the columns to the version model**

In `prisma/schema.prisma`, inside `model crm_Target_Homepage_Version`, add after `created_at`:

```prisma
  // fork: per-pass Anthropic token usage for cost tracking (null for upload
  // versions and for passes generated before cost tracking shipped).
  model                 String?
  input_tokens          Int?
  output_tokens         Int?
  cache_read_tokens     Int?
  cache_creation_tokens Int?
```

- [ ] **Step 3: Author the migration**

Run: `pnpm exec prisma migrate dev --name homepage_version_usage`
Expected: a new folder under `prisma/migrations/` whose `migration.sql` does `ALTER TABLE "crm_Target_Homepage_Version" ADD COLUMN ...` for the five nullable columns; Prisma Client regenerates.

- [ ] **Step 4: Verify the client typechecks**

Run: `pnpm exec tsc --noEmit`
Expected: PASS (the new optional fields are available on the version model type).

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(homepage): add per-pass usage columns to homepage version"
```

---

### Task 2: Pricing + aggregation helper (`lib/homepage/cost.ts`)

**Files:**
- Create: `lib/homepage/cost.ts`
- Test: `lib/homepage/__tests__/cost.test.ts`

**Interfaces:**
- Produces:
  - `computePassCostUsd(usage: PassUsage, model: string | null | undefined): number`
  - `summarizeHomepageCost(versions: VersionCostInput[]): TargetCostSummary`
  - types `PassUsage`, `VersionCostInput`, `TargetCostSummary`, and `HOMEPAGE_MODEL_PRICING`.

- [ ] **Step 1: Write the failing tests**

```ts
// lib/homepage/__tests__/cost.test.ts
import {
  computePassCostUsd,
  summarizeHomepageCost,
  type VersionCostInput,
} from "@/lib/homepage/cost";

const gen = (over: Partial<VersionCostInput>): VersionCostInput => ({
  pass_kind: "AUTO",
  model: "claude-sonnet-5-5",
  created_at: new Date("2026-10-01T00:00:00Z"),
  input_tokens: 0,
  output_tokens: 0,
  cache_read_tokens: 0,
  cache_creation_tokens: 0,
  ...over,
});

describe("computePassCostUsd", () => {
  it("prices all four token buckets for a known model", () => {
    // sonnet-5-5: in 2.0, out 10.0, cacheRead 0.20, cacheWrite 2.50 per 1M
    const cost = computePassCostUsd(
      { input_tokens: 1_000_000, output_tokens: 1_000_000, cache_read_tokens: 1_000_000, cache_creation_tokens: 1_000_000 },
      "claude-sonnet-5-5",
    );
    expect(cost).toBeCloseTo(2.0 + 10.0 + 0.2 + 2.5, 6);
  });

  it("treats missing/null token fields as 0 (never NaN)", () => {
    const cost = computePassCostUsd({ input_tokens: 1_000_000, output_tokens: null }, "claude-sonnet-5-5");
    expect(cost).toBeCloseTo(2.0, 6);
    expect(Number.isNaN(cost)).toBe(false);
  });

  it("returns 0 for an unknown or null model (no throw)", () => {
    expect(computePassCostUsd({ input_tokens: 9_999 }, "some-legacy-model")).toBe(0);
    expect(computePassCostUsd({ input_tokens: 9_999 }, null)).toBe(0);
  });
});

describe("summarizeHomepageCost", () => {
  it("counts only AUTO/HUMAN passes and sums their cost", () => {
    const s = summarizeHomepageCost([
      gen({ output_tokens: 1_000_000, created_at: new Date("2026-10-01") }),
      gen({ pass_kind: "HUMAN", output_tokens: 1_000_000, created_at: new Date("2026-10-02") }),
      gen({ pass_kind: "UPLOAD", output_tokens: 1_000_000, created_at: new Date("2026-10-03") }),
    ]);
    expect(s.generations).toBe(2);
    expect(s.totalCostUsd).toBeCloseTo(20.0, 6); // 2 x (1M out x $10)
    expect(s.lastGenerationAt).toEqual(new Date("2026-10-02")); // UPLOAD ignored
    expect(s.outputTokens).toBe(2_000_000);
  });

  it("reports the most recent model and a distinct-model count", () => {
    const s = summarizeHomepageCost([
      gen({ model: "claude-sonnet-5-5", created_at: new Date("2026-10-01") }),
      gen({ model: "claude-opus-5-5", created_at: new Date("2026-10-02") }),
    ]);
    expect(s.model).toBe("claude-opus-5-5");
    expect(s.modelCount).toBe(2);
  });

  it("flags pre-tracking generations (model null) and never NaN cost", () => {
    const s = summarizeHomepageCost([gen({ model: null, input_tokens: null, output_tokens: null })]);
    expect(s.generations).toBe(1);
    expect(s.hasUntracked).toBe(true);
    expect(s.totalCostUsd).toBe(0);
  });

  it("handles a homepage with no generation passes", () => {
    const s = summarizeHomepageCost([gen({ pass_kind: "UPLOAD" })]);
    expect(s.generations).toBe(0);
    expect(s.lastGenerationAt).toBeNull();
    expect(s.model).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec jest lib/homepage/__tests__/cost.test.ts`
Expected: FAIL with "Cannot find module '@/lib/homepage/cost'".

- [ ] **Step 3: Implement `lib/homepage/cost.ts`**

```ts
export type PassUsage = {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_tokens?: number | null;
  cache_creation_tokens?: number | null;
};

type Rate = { input: number; output: number; cacheRead: number; cacheWrite: number };

/** USD per 1,000,000 tokens. Keyed by the exact HOMEPAGE_MODELS ids. */
export const HOMEPAGE_MODEL_PRICING: Record<string, Rate> = {
  "claude-sonnet-5-5": { input: 2.0, output: 10.0, cacheRead: 0.2, cacheWrite: 2.5 },
  "claude-opus-5-5": { input: 4.0, output: 20.0, cacheRead: 0.2, cacheWrite: 5.0 },
  "claude-haiku-4-5-20251001": { input: 1.0, output: 5.0, cacheRead: 0.1, cacheWrite: 1.25 },
};

const num = (x: number | null | undefined): number =>
  typeof x === "number" && Number.isFinite(x) ? x : 0;

export function computePassCostUsd(usage: PassUsage, model: string | null | undefined): number {
  const rate = model ? HOMEPAGE_MODEL_PRICING[model] : undefined;
  if (!rate) return 0;
  return (
    (num(usage.input_tokens) * rate.input +
      num(usage.output_tokens) * rate.output +
      num(usage.cache_read_tokens) * rate.cacheRead +
      num(usage.cache_creation_tokens) * rate.cacheWrite) /
    1_000_000
  );
}

export type VersionCostInput = PassUsage & {
  pass_kind: "AUTO" | "HUMAN" | "UPLOAD";
  model: string | null;
  created_at: Date;
};

export type TargetCostSummary = {
  generations: number;
  lastGenerationAt: Date | null;
  model: string | null;
  modelCount: number;
  totalCostUsd: number;
  inputTokens: number;
  outputTokens: number;
  hasUntracked: boolean;
};

/** Aggregate one homepage's versions into a per-target summary. Only AUTO/HUMAN
 *  passes (real model calls) count toward generations, cost and last-gen date. */
export function summarizeHomepageCost(versions: VersionCostInput[]): TargetCostSummary {
  const gens = versions
    .filter((v) => v.pass_kind === "AUTO" || v.pass_kind === "HUMAN")
    .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

  let totalCostUsd = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let hasUntracked = false;
  const models = new Set<string>();
  for (const v of gens) {
    totalCostUsd += computePassCostUsd(v, v.model);
    inputTokens += num(v.input_tokens);
    outputTokens += num(v.output_tokens);
    if (v.model) models.add(v.model);
    else hasUntracked = true;
  }

  return {
    generations: gens.length,
    lastGenerationAt: gens[0]?.created_at ?? null,
    model: gens[0]?.model ?? null,
    modelCount: models.size,
    totalCostUsd,
    inputTokens,
    outputTokens,
    hasUntracked,
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec jest lib/homepage/__tests__/cost.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add lib/homepage/cost.ts lib/homepage/__tests__/cost.test.ts
git commit -m "feat(homepage): add token pricing + per-target cost aggregation helper"
```

---

### Task 3: Persist usage on each generation pass

**Files:**
- Modify: `inngest/functions/generate-homepage.ts` (persist step, ~line 312)
- Modify: `lib/homepage/provider.ts` (add `$` to the `[HOMEPAGE_USAGE]` log — optional nicety)
- Test: `inngest/functions/__tests__/generate-homepage.test.ts` (extend existing provider mock + persist assertion)

**Interfaces:**
- Consumes: `GenerateHomepageResult.usage` (added earlier on this branch) and `args.model` inside `runPass`.
- Produces: version rows now carry `model` + the four token columns for AUTO/HUMAN passes.

- [ ] **Step 1: Extend the integration test's provider mock to return usage**

In `inngest/functions/__tests__/generate-homepage.test.ts`, find the `generateHomepage` mock (~line 153) and add a `usage` field to its returned object:

```ts
  (generateHomepage as jest.Mock).mockImplementation(async () => ({
    html: "<html>draft</html>",
    critique: "ok",
    usage: {
      input_tokens: 100,
      output_tokens: 200,
      cache_read_input_tokens: 0,
      cache_creation_input_tokens: 0,
    },
  }));
```

(Keep the existing `html`/`critique` values if they differ — only add `usage`.)

- [ ] **Step 2: Add a failing assertion that the persisted version carries usage**

In the existing test that loops over `versionCreate.mock.calls` (the `pass_kind` assertion, ~line 279), add inside the loop:

```ts
    for (const call of versionCreate.mock.calls) {
      expect(call[0].data.pass_kind).toBe("AUTO");
      expect(call[0].data.input_tokens).toBe(100);
      expect(call[0].data.output_tokens).toBe(200);
      expect(call[0].data.cache_read_tokens).toBe(0);
      expect(call[0].data.cache_creation_tokens).toBe(0);
      expect(typeof call[0].data.model).toBe("string");
    }
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm exec jest inngest/functions/__tests__/generate-homepage.test.ts -t "persists"`
(Use the describe/it text that contains the versionCreate loop; run the file if unsure.)
Expected: FAIL — `input_tokens` is `undefined` on the create payload.

- [ ] **Step 4: Write the usage into the persist step**

In `inngest/functions/generate-homepage.ts`, change the version create (~line 312) to include model + tokens from `gen.usage`:

```ts
    const v = await prismadb.crm_Target_Homepage_Version.create({
      data: {
        homepage_id: args.homepage.id,
        html: gen.html,
        prompt: args.versionPrompt,
        agent_critique: gen.critique,
        pass_kind: args.passKind,
        created_by: args.createdBy,
        model: args.model,
        input_tokens: gen.usage?.input_tokens ?? null,
        output_tokens: gen.usage?.output_tokens ?? null,
        cache_read_tokens: gen.usage?.cache_read_input_tokens ?? null,
        cache_creation_tokens: gen.usage?.cache_creation_input_tokens ?? null,
      },
      select: { id: true },
    });
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm exec jest inngest/functions/__tests__/generate-homepage.test.ts`
Expected: PASS (whole file green — the new assertions and all prior ones).

- [ ] **Step 6: (Optional) add `$` to the usage log**

In `lib/homepage/provider.ts`, import the cost helper and add a `cost_usd` field to the `[HOMEPAGE_USAGE]` log object:

```ts
import { computePassCostUsd } from "@/lib/homepage/cost";
// ...inside the usage log block:
      cost_usd: usage
        ? Number(
            computePassCostUsd(
              {
                input_tokens: usage.input_tokens,
                output_tokens: usage.output_tokens,
                cache_read_tokens: usage.cache_read_input_tokens,
                cache_creation_tokens: usage.cache_creation_input_tokens,
              },
              input.model,
            ).toFixed(4),
          )
        : undefined,
```

- [ ] **Step 7: Typecheck + commit**

Run: `pnpm exec tsc --noEmit` (expect PASS)

```bash
git add inngest/functions/generate-homepage.ts lib/homepage/provider.ts inngest/functions/__tests__/generate-homepage.test.ts
git commit -m "feat(homepage): persist per-pass model + token usage on version rows"
```

---

### Task 4: Admin aggregation action (`getHomepageCostsForAdmin`)

**Files:**
- Create: `actions/admin/homepage-costs.ts`
- Test: `actions/admin/__tests__/homepage-costs.test.ts`

**Interfaces:**
- Consumes: `summarizeHomepageCost` + `TargetCostSummary` from `@/lib/homepage/cost`; `requireRole` from `@/lib/authz`.
- Produces: `getHomepageCostsForAdmin(): Promise<{ data: HomepageCostRow[] } | { error: string }>` and type `HomepageCostRow = { targetId: string; company: string; summary: TargetCostSummary }`.

- [ ] **Step 1: Write the failing test**

```ts
// actions/admin/__tests__/homepage-costs.test.ts
jest.mock("@/lib/authz", () => ({
  requireRole: jest.fn(),
  AuthenticationError: class AuthenticationError extends Error {},
  AuthorizationError: class AuthorizationError extends Error {},
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: { crm_Target_Homepage: { findMany: jest.fn() } },
}));

import { requireRole, AuthorizationError } from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import { getHomepageCostsForAdmin } from "@/actions/admin/homepage-costs";

const findMany = prismadb.crm_Target_Homepage.findMany as jest.Mock;
const role = requireRole as jest.Mock;

const ver = (over: Record<string, unknown>) => ({
  pass_kind: "AUTO",
  model: "claude-sonnet-5-5",
  created_at: new Date("2026-10-01"),
  input_tokens: 1_000_000,
  output_tokens: 1_000_000,
  cache_read_tokens: 0,
  cache_creation_tokens: 0,
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  role.mockResolvedValue({ id: "admin1", role: "admin" });
});

it("returns Forbidden for non-admins", async () => {
  role.mockRejectedValue(new AuthorizationError());
  expect(await getHomepageCostsForAdmin()).toEqual({ error: "Forbidden" });
});

it("aggregates per target and sorts by last generation, newest first", async () => {
  findMany.mockResolvedValue([
    {
      targetId: "t-old",
      target: { company: "Old Co" },
      versions: [ver({ created_at: new Date("2026-09-01") })],
    },
    {
      targetId: "t-new",
      target: { company: "New Co" },
      versions: [ver({ created_at: new Date("2026-10-05") }), ver({ created_at: new Date("2026-10-06") })],
    },
  ]);
  const res = await getHomepageCostsForAdmin();
  if ("error" in res) throw new Error("unexpected error");
  expect(res.data.map((r) => r.company)).toEqual(["New Co", "Old Co"]);
  expect(res.data[0].summary.generations).toBe(2);
  expect(res.data[1].summary.totalCostUsd).toBeCloseTo(12.0, 6); // 1M in x$2 + 1M out x$10
});

it("never selects the html column", async () => {
  findMany.mockResolvedValue([]);
  await getHomepageCostsForAdmin();
  const arg = findMany.mock.calls[0][0];
  expect(arg.select.versions.select.html).toBeUndefined();
  expect("html" in arg.select).toBe(false);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec jest actions/admin/__tests__/homepage-costs.test.ts`
Expected: FAIL with "Cannot find module '@/actions/admin/homepage-costs'".

- [ ] **Step 3: Implement the action**

```ts
// actions/admin/homepage-costs.ts
"use server";

import { prismadb } from "@/lib/prisma";
import { requireRole, AuthenticationError, AuthorizationError } from "@/lib/authz";
import { summarizeHomepageCost, type TargetCostSummary, type VersionCostInput } from "@/lib/homepage/cost";

export type HomepageCostRow = {
  targetId: string;
  company: string;
  summary: TargetCostSummary;
};

export async function getHomepageCostsForAdmin(): Promise<
  { data: HomepageCostRow[] } | { error: string }
> {
  try {
    await requireRole(["admin"]);
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    throw e;
  }

  const homepages = await prismadb.crm_Target_Homepage.findMany({
    where: { deletedAt: null },
    select: {
      targetId: true,
      target: { select: { company: true } },
      versions: {
        select: {
          pass_kind: true,
          model: true,
          created_at: true,
          input_tokens: true,
          output_tokens: true,
          cache_read_tokens: true,
          cache_creation_tokens: true,
        },
      },
    },
  });

  const rows: HomepageCostRow[] = homepages.map((h) => ({
    targetId: h.targetId,
    company: h.target?.company ?? "(unknown)",
    summary: summarizeHomepageCost(h.versions as VersionCostInput[]),
  }));

  rows.sort((a, b) => {
    const at = a.summary.lastGenerationAt?.getTime() ?? 0;
    const bt = b.summary.lastGenerationAt?.getTime() ?? 0;
    return bt - at; // newest first; never-generated (0) sink to the bottom
  });

  return { data: rows };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec jest actions/admin/__tests__/homepage-costs.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add actions/admin/homepage-costs.ts actions/admin/__tests__/homepage-costs.test.ts
git commit -m "feat(admin): per-target homepage cost aggregation action"
```

---

### Task 5: Admin page + nav link

**Files:**
- Create: `app/[locale]/(routes)/admin/homepage-costs/page.tsx`
- Modify: `app/[locale]/(routes)/admin/_components/AdminSidebarNav.tsx`

**Interfaces:**
- Consumes: `getHomepageCostsForAdmin` from `@/actions/admin/homepage-costs`.

- [ ] **Step 1: Add the nav item**

In `AdminSidebarNav.tsx`, add `Coins`-style icon import if needed and a nav entry after the "Homepage Generation" line:

```tsx
  { label: "Homepage Costs", href: "/admin/homepage-costs", icon: Coins },
```

(`Coins` is already imported in this file.)

- [ ] **Step 2: Create the page**

```tsx
// app/[locale]/(routes)/admin/homepage-costs/page.tsx
import { getHomepageCostsForAdmin } from "@/actions/admin/homepage-costs";

const money = (n: number) => `$${n.toFixed(2)}`;
const tokens = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));
const date = (d: Date | null) => (d ? new Date(d).toLocaleString() : "—");

export default async function HomepageCostsPage() {
  const res = await getHomepageCostsForAdmin();

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Homepage Costs</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Accumulated homepage-generation cost per target, across every generation and refine
          iteration. Costs are recorded from when tracking was enabled; earlier passes show $0.00.
        </p>
      </div>

      {"error" in res ? (
        <p className="text-sm text-destructive">{res.error}</p>
      ) : res.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No homepage generations yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Target</th>
                <th className="px-3 py-2 font-medium">Last generation</th>
                <th className="px-3 py-2 font-medium text-right"># gens</th>
                <th className="px-3 py-2 font-medium">Model</th>
                <th className="px-3 py-2 font-medium text-right">Total cost</th>
                <th className="px-3 py-2 font-medium text-right text-muted-foreground">Tokens (in/out)</th>
              </tr>
            </thead>
            <tbody>
              {res.data.map((r) => (
                <tr key={r.targetId} className="border-t">
                  <td className="px-3 py-2">{r.company}</td>
                  <td className="px-3 py-2">{date(r.summary.lastGenerationAt)}</td>
                  <td className="px-3 py-2 text-right">{r.summary.generations}</td>
                  <td className="px-3 py-2">
                    {r.summary.model ?? "—"}
                    {r.summary.modelCount > 1 ? ` (+${r.summary.modelCount - 1})` : ""}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {money(r.summary.totalCostUsd)}
                    {r.summary.hasUntracked ? (
                      <span className="ml-1 text-xs text-muted-foreground">(pre-tracking)</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-right text-muted-foreground">
                    {tokens(r.summary.inputTokens)} / {tokens(r.summary.outputTokens)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Lint + typecheck**

Run: `pnpm lint && pnpm exec tsc --noEmit`
Expected: PASS (no unused imports; `Coins` already imported).

- [ ] **Step 4: Manual verification in the running app**

Start the app, sign in as an admin, open `/admin/homepage-costs`. Confirm: the nav item appears and is active; targets are listed newest-first by last generation; a freshly regenerated target shows a non-zero cost and its generation count increments by 4 per auto run; older/pre-tracking rows show `$0.00 (pre-tracking)`. (Use the `run` skill / `preview_start` per repo tooling.)

- [ ] **Step 5: Commit**

```bash
git add "app/[locale]/(routes)/admin/homepage-costs/page.tsx" "app/[locale]/(routes)/admin/_components/AdminSidebarNav.tsx"
git commit -m "feat(admin): homepage costs page + nav link"
```

---

## Post-implementation (before PR)

- Run the pre-PR gate: `deep-review` skill (money/cost correctness, admin authz, no `html` leak), then the doc-sync walk.
- Doc-sync targets: `docs/reference/PROJECT_STRUCTURE.md` (new admin route + `lib/homepage/cost.ts` + action), the data-model doc (five new version columns), and `LESSONS_LEARNED.md` if any gotcha surfaced. No `.env` changes. No upstream-owned files touched → no `UPSTREAM_IMPACT_LOG.md` entry.
- After merge, remind the user the deploy applies the new migration to QA (then Promote to prod) — do not apply by hand.
