# Permission-Driven Authorization — Phase B3 (Reports) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Stop unscoped global-data leaks across the reports surface — export route, six per-category report functions, dashboard counts, unified-search cross-entity facet, report config/schedule visibility, and the Inngest scheduled-report sender. After B3, a `user` sees only data they own; `manager` sees business-wide non-admin data; `admin` sees everything.

**Architecture:** Add a single `lib/authz/scopes/report-scope.ts` module that returns a `ReportScope` object — a bag of per-entity Prisma `where` fragments parameterized by user role and id. Every report category function accepts an optional `scope` argument; if omitted, manager-level scope (no filter) is used (back-compat for tests). The export route + Inngest scheduled sender pass the appropriate scope per caller. Config and schedule list/CRUD are filtered by `createdBy === user.id OR isShared` for users (configs only — schedules stay private), bare for manager/admin. The `users` report category is **manager+** only — users get 403.

**Out of scope:** Soft caching of scope helpers, fancy ABAC. The 6 report categories get the same shape applied — no new feature work, only filters and gates.

**Spec source:** §6.13, §7.6, §8.15, §8.16, §12 Phase 5.
**Audit source:** "Global Report Export", "Global Document Listing", "Global CRM Read Actions" (similar shape).

---

## File Structure

**New files:**
- `lib/authz/scopes/report-scope.ts` — `ReportScope` interface + `getReportScope(user)`
- `lib/authz/__tests__/report-scope.test.ts`
- `app/api/reports/export/__tests__/route.test.ts`
- `actions/reports/__tests__/users-report-gating.test.ts`
- `actions/reports/__tests__/config-scope.test.ts`
- `actions/reports/__tests__/schedule-scope.test.ts`
- `actions/dashboard/__tests__/get-tasks-count.test.ts`
- `inngest/functions/reports/__tests__/send-scheduled-scope.test.ts`

**Modified files:**
- `lib/authz/index.ts`
- `actions/reports/sales.ts` — accept optional `scope`; apply `where` for opportunity/account scoping
- `actions/reports/leads.ts` — accept optional `scope`
- `actions/reports/accounts.ts` — accept optional `scope`
- `actions/reports/activity.ts` — accept optional `scope`
- `actions/reports/campaigns.ts` — accept optional `scope`
- `actions/reports/users.ts` — manager+ only (entire file gated)
- `actions/reports/dashboard.ts` — `getDashboardKPIs(filters, displayCurrency, scope?)`
- `actions/reports/types.ts` — export `ReportScope` type alias for consumers
- `app/api/reports/export/route.ts` — `requireAuthenticated`, build scope, gate `users` category, pass scope to category dispatch
- `actions/reports/config.ts` — `loadConfigs` filters by user; `saveConfig`, `deleteConfig`, `toggleShare`, `duplicateConfig` enforce ownership-or-admin
- `actions/reports/schedule.ts` — same shape
- `actions/dashboard/get-tasks-count.ts` — scope by user (with role override)
- `actions/fulltext/unified-search.ts` — apply scope filters per entity
- `inngest/functions/reports/send-scheduled.ts` — scope per schedule's `createdBy` user

---

## Task 1: `ReportScope` interface and builder

**Files:**
- Create: `lib/authz/scopes/report-scope.ts`
- Create: `lib/authz/__tests__/report-scope.test.ts`
- Modify: `lib/authz/index.ts`

`ReportScope` is a bag of partial `where` filters per entity. For manager/admin every field is `{}`. For user, each field constrains to the rows that user owns/created/is-assigned-to. Report-category functions merge their own date filter with `scope.<entity>` via spread.

- [ ] **Step 1: Failing test**

`lib/authz/__tests__/report-scope.test.ts`:
```ts
import { getReportScope } from "../scopes/report-scope";

describe("getReportScope", () => {
  it("admin: all fragments empty (no filter)", () => {
    const s = getReportScope({ id: "a", role: "admin" });
    expect(s.opportunity).toEqual({});
    expect(s.lead).toEqual({});
    expect(s.account).toEqual({});
    expect(s.contact).toEqual({});
    expect(s.task).toEqual({});
    expect(s.campaign).toEqual({});
    expect(s.allowUserDirectory).toBe(true);
  });

  it("manager: same as admin for non-admin entities", () => {
    const s = getReportScope({ id: "m", role: "manager" });
    expect(s.opportunity).toEqual({});
    expect(s.lead).toEqual({});
    expect(s.allowUserDirectory).toBe(true);
  });

  it("user: each entity filters to user-owned rows", () => {
    const s = getReportScope({ id: "u1", role: "user" });
    expect(s.opportunity).toMatchObject({
      OR: expect.arrayContaining([
        { assigned_to: "u1" },
        { created_by: "u1" },
      ]),
    });
    expect(s.lead).toMatchObject({
      OR: expect.arrayContaining([{ assigned_to: "u1" }, { createdBy: "u1" }]),
    });
    expect(s.account).toMatchObject({
      OR: expect.arrayContaining([
        { assigned_to: "u1" },
        { createdBy: "u1" },
        { watchers: { some: { user_id: "u1" } } },
      ]),
    });
    expect(s.contact).toMatchObject({
      OR: expect.arrayContaining([
        { assigned_to: "u1" },
        { created_by: "u1" },
        { createdBy: "u1" },
      ]),
    });
    expect(s.task).toMatchObject({ user: "u1" });
    expect(s.campaign).toMatchObject({ created_by: "u1" });
    expect(s.allowUserDirectory).toBe(false);
  });
});
```

- [ ] **Step 2: Failing test**

- [ ] **Step 3: Implement**

`lib/authz/scopes/report-scope.ts`:
```ts
import type { AuthzUser } from "../session";

export interface ReportScope {
  opportunity: Record<string, unknown>;
  lead: Record<string, unknown>;
  account: Record<string, unknown>;
  contact: Record<string, unknown>;
  task: Record<string, unknown>;
  campaign: Record<string, unknown>;
  allowUserDirectory: boolean;
}

const EMPTY: ReportScope = {
  opportunity: {},
  lead: {},
  account: {},
  contact: {},
  task: {},
  campaign: {},
  allowUserDirectory: true,
};

export function getReportScope(user: AuthzUser): ReportScope {
  if (user.role === "admin" || user.role === "manager") return EMPTY;
  return {
    opportunity: {
      OR: [{ assigned_to: user.id }, { created_by: user.id }],
    },
    lead: { OR: [{ assigned_to: user.id }, { createdBy: user.id }] },
    account: {
      OR: [
        { assigned_to: user.id },
        { createdBy: user.id },
        { watchers: { some: { user_id: user.id } } },
      ],
    },
    contact: {
      OR: [
        { assigned_to: user.id },
        { created_by: user.id },
        { createdBy: user.id },
      ],
    },
    task: { user: user.id },
    campaign: { created_by: user.id },
    allowUserDirectory: false,
  };
}
```

- [ ] **Step 4: Add to barrel**

```ts
export type { ReportScope } from "./scopes/report-scope";
export { getReportScope } from "./scopes/report-scope";
```

- [ ] **Step 5: Test → PASS, commit**

```bash
git add lib/authz/scopes/report-scope.ts lib/authz/__tests__/report-scope.test.ts lib/authz/index.ts
git commit -m "feat(authz): add ReportScope builder for per-role report data filtering"
```

---

## Task 2: Apply scope to report category functions

**Files:**
- Modify: `actions/reports/sales.ts`, `leads.ts`, `accounts.ts`, `activity.ts`, `campaigns.ts`, `dashboard.ts`
- Modify: `actions/reports/types.ts`

Add an optional `scope: ReportScope` parameter to every exported category function. Default: `getReportScope({id:"",role:"manager"})` (a manager-equivalent empty scope) so existing direct callers keep working without updates.

Inside each function, merge the entity scope into every `prismadb.crm_X.findMany / count` call. Pattern:

```ts
const data = await prismadb.crm_Opportunities.findMany({
  where: {
    ...dateRangeWhere(filters),
    status: "CLOSED",
    deletedAt: null,
    ...scope.opportunity,
  },
  // ...
});
```

- [ ] **Step 1: Read each file and identify every Prisma read**

```bash
grep -n "prismadb\." actions/reports/sales.ts actions/reports/leads.ts actions/reports/accounts.ts actions/reports/activity.ts actions/reports/campaigns.ts actions/reports/dashboard.ts | head -80
```

Map each query to the right `scope.<entity>` field:
- `crm_Opportunities` → `scope.opportunity`
- `crm_Leads` → `scope.lead`
- `crm_Accounts` → `scope.account`
- `crm_Contacts` → `scope.contact`
- `tasks` → `scope.task`
- `crm_campaigns` → `scope.campaign`
- `crm_Activities` (if present) → choose closest entity (likely user-owned via `created_by`)

- [ ] **Step 2: Update each file**

For each exported function, change signature to accept `scope?: ReportScope`. Default to manager-empty:

```ts
import type { ReportScope } from "@/lib/authz";
import { getReportScope } from "@/lib/authz";

const DEFAULT_SCOPE: ReportScope = getReportScope({ id: "", role: "manager" });

export async function getRevenue(
  filters: ReportFilters,
  displayCurrency: string,
  scope: ReportScope = DEFAULT_SCOPE,
): Promise<number> {
  const opps = await prismadb.crm_Opportunities.findMany({
    where: {
      ...dateRangeWhere(filters),
      status: "CLOSED",
      ...scope.opportunity,
    },
    select: { budget: true, currency: true },
  });
  // ...
}
```

Apply the same pattern to every exported function in `sales.ts`, `leads.ts`, `accounts.ts`, `activity.ts`, `campaigns.ts`, `dashboard.ts`.

- [ ] **Step 3: Add a test that the scope is applied**

Pick `sales.ts` as the canary — the implementer adds one new test verifying `getRevenue` passes `scope.opportunity` into the `where` clause:

```ts
// in __tests__/reports/sales.test.ts (append):
import { getReportScope } from "@/lib/authz";

it("applies user scope to opportunities query", async () => {
  (prismadb.crm_Opportunities.findMany as jest.Mock).mockResolvedValue([]);
  const scope = getReportScope({ id: "u3", role: "user" });
  await getRevenue({ dateFrom: new Date(), dateTo: new Date() }, "USD", scope);
  const arg = (prismadb.crm_Opportunities.findMany as jest.Mock).mock.calls.at(-1)![0];
  expect(arg.where.OR).toEqual(
    expect.arrayContaining([{ assigned_to: "u3" }, { created_by: "u3" }]),
  );
});
```

(One canary test per file is enough — the pattern is uniform.)

- [ ] **Step 4: Run all report tests**

```bash
pnpm jest reports 2>&1 | tail -15
```
Expected: same baseline. Existing tests still pass because default scope is a no-op.

- [ ] **Step 5: Commit**

```bash
git add actions/reports/ __tests__/reports/
git commit -m "feat(reports): per-category functions accept ReportScope to filter data by role"
```

---

## Task 3: Gate `users` report (manager+ only)

**Files:**
- Modify: `actions/reports/users.ts`
- Create: `actions/reports/__tests__/users-report-gating.test.ts`

`users.ts` exports `getActiveUsersByYear`, `getActiveUsersLifetime`, `getUserGrowth`, `getUsersByRole`. These queries reveal counts/IDs across the entire user directory — must be **manager+ only**.

- [ ] **Step 1: Failing test**

```ts
jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn(), groupBy: jest.fn(), count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
  },
}));

import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { getUsersByRole } from "../users";

const gs = getSession as jest.MockedFunction<typeof getSession>;
const fu = prismadb.users.findUnique as jest.MockedFunction<typeof prismadb.users.findUnique>;

beforeEach(() => jest.clearAllMocks());

describe("users-report gating", () => {
  it("user role is rejected", async () => {
    gs.mockResolvedValue({ user: { id: "u" } } as any);
    fu.mockResolvedValue({ id: "u", role: "user" } as any);
    await expect(getUsersByRole({ dateFrom: new Date(), dateTo: new Date() })).rejects.toThrow(/forbidden/i);
  });

  it("manager allowed", async () => {
    gs.mockResolvedValue({ user: { id: "m" } } as any);
    fu.mockResolvedValue({ id: "m", role: "manager" } as any);
    (prismadb.users.groupBy as jest.Mock).mockResolvedValue([]);
    await expect(getUsersByRole({ dateFrom: new Date(), dateTo: new Date() })).resolves.toBeDefined();
  });
});
```

- [ ] **Step 2: Failing test**

- [ ] **Step 3: Patch `users.ts`**

Add a guard at the top of every exported function:

```ts
import { requireRole, AuthorizationError } from "@/lib/authz";

async function ensureManagerOrAdmin() {
  try {
    await requireRole(["manager", "admin"]);
  } catch (e) {
    if (e instanceof AuthorizationError) throw new Error("Forbidden");
    throw e;
  }
}

export async function getActiveUsersByYear(filters: ReportFilters) {
  await ensureManagerOrAdmin();
  // existing body
}

// Same prefix to getActiveUsersLifetime, getUserGrowth, getUsersByRole.
```

- [ ] **Step 4: Test → PASS, commit**

```bash
git add actions/reports/users.ts actions/reports/__tests__/users-report-gating.test.ts
git commit -m "fix(reports): gate users-directory report behind manager/admin"
```

---

## Task 4: Patch report export route

**Files:**
- Modify: `app/api/reports/export/route.ts`
- Create: `app/api/reports/export/__tests__/route.test.ts`

Wire authentication, build scope, dispatch to category. For `category === "users"`, require manager+. For other categories, pass scope to the category functions.

- [ ] **Step 1: Failing test**

```ts
jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: { users: { findUnique: jest.fn() } },
}));

// Mock the report data dispatcher so we can assert it received the scope.
jest.mock("@/actions/reports/dashboard", () => ({
  getDashboardKPIs: jest.fn().mockResolvedValue([]),
}));
jest.mock("@/actions/reports/sales", () => ({
  getRevenue: jest.fn().mockResolvedValue(0),
  // ... add stubs as needed for the route's category dispatch
}));

import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { GET } from "../route";

const gs = getSession as jest.MockedFunction<typeof getSession>;
const fu = prismadb.users.findUnique as jest.MockedFunction<typeof prismadb.users.findUnique>;

beforeEach(() => jest.clearAllMocks());

describe("GET /api/reports/export", () => {
  it("401 unauth", async () => {
    gs.mockResolvedValue(null as any);
    const res = await GET(new NextRequest("http://localhost/api/reports/export?category=sales"));
    expect(res.status).toBe(401);
  });

  it("403 when user requests users-directory report", async () => {
    gs.mockResolvedValue({ user: { id: "u" } } as any);
    fu.mockResolvedValue({ id: "u", role: "user" } as any);
    const res = await GET(new NextRequest("http://localhost/api/reports/export?category=users"));
    expect(res.status).toBe(403);
  });

  it("user can export sales-category report (scope passed)", async () => {
    gs.mockResolvedValue({ user: { id: "u" } } as any);
    fu.mockResolvedValue({ id: "u", role: "user" } as any);
    const res = await GET(new NextRequest("http://localhost/api/reports/export?category=sales&format=csv"));
    expect([200]).toContain(res.status);
  });

  it("400 for unknown category", async () => {
    gs.mockResolvedValue({ user: { id: "u" } } as any);
    fu.mockResolvedValue({ id: "u", role: "manager" } as any);
    const res = await GET(new NextRequest("http://localhost/api/reports/export?category=bogus"));
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Failing test**

- [ ] **Step 3: Patch route**

Replace the auth + dispatch section of `app/api/reports/export/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import {
  requireAuthenticated,
  unauthorizedResponse,
  forbiddenResponse,
  AuthenticationError,
  getReportScope,
} from "@/lib/authz";
import { generateCSV } from "@/actions/reports/export-csv";
import { parseSearchParamsToFilters, REPORT_CATEGORIES } from "@/actions/reports/types";
// existing imports for getReportData / per-category dispatcher

export async function GET(request: NextRequest) {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return unauthorizedResponse();
    throw e;
  }

  const { searchParams } = request.nextUrl;
  const category = searchParams.get("category") ?? "sales";
  const format = searchParams.get("format") ?? "csv";

  if (!REPORT_CATEGORIES.includes(category as any)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  if (category === "users" && user.role === "user") {
    return forbiddenResponse();
  }

  const filters = parseSearchParamsToFilters(searchParams);
  const scope = getReportScope(user);

  // Pass scope through to whatever dispatcher the route uses.
  // If `getReportData` is the dispatcher, update its signature too:
  // getReportData(category, filters, scope)
  const { data, headers } = await getReportData(category, filters, scope);

  // ... existing CSV / PDF response handling unchanged
}
```

`getReportData` (or whatever the route's dispatcher is named — confirm at file top) needs to accept `scope` and pass it into the per-category function it calls. Update its signature in lockstep.

- [ ] **Step 4: Test → PASS, commit**

```bash
git add app/api/reports/export/route.ts app/api/reports/export/__tests__/route.test.ts
git commit -m "fix(api): scope reports/export by role; gate users-directory report"
```

---

## Task 5: Scope report config and schedule actions

**Files:**
- Modify: `actions/reports/config.ts`
- Modify: `actions/reports/schedule.ts`
- Create: `actions/reports/__tests__/config-scope.test.ts`
- Create: `actions/reports/__tests__/schedule-scope.test.ts`

Per spec §6.13:
- **Configs:** users see `createdBy === user.id OR isShared`. Mutations require ownership-or-admin (managers cannot edit other users' private configs).
- **Schedules:** users see only their own. Mutations require ownership-or-admin.

- [ ] **Step 1: Patch `config.ts`**

Add `requireAuthenticated` at the top of every exported function. Apply scope to `loadConfigs`. Add ownership-or-admin checks to `deleteConfig`, `duplicateConfig`, `toggleShare`, `saveConfig` (saveConfig sets `createdBy` from authenticated user — never trust caller-supplied id).

Pseudocode for `loadConfigs`:
```ts
const user = await requireAuthenticated();
const where =
  user.role === "admin" || user.role === "manager"
    ? { category }
    : { category, OR: [{ createdBy: user.id }, { isShared: true }] };
return prismadb.crm_Report_Config.findMany({ where });
```

For `deleteConfig`/`duplicateConfig`/`toggleShare`:
```ts
const user = await requireAuthenticated();
const cfg = await prismadb.crm_Report_Config.findUnique({
  where: { id: configId },
  select: { id: true, createdBy: true },
});
if (!cfg) throw new Error("Not found");
if (user.role !== "admin" && user.role !== "manager" && cfg.createdBy !== user.id) {
  throw new Error("Forbidden");
}
```

Note: managers can edit other users' shared configs but NOT private ones — adjust the check if the product wants this. Default per spec: managers can edit other users' configs (manager = business-wide).

- [ ] **Step 2: Patch `schedule.ts`** — same shape but no `isShared` column. User scope = `createdBy === user.id`. Manager/admin = bare.

- [ ] **Step 3: Tests** — for each file create a test asserting:
  - 401 unauth
  - User can read own + shared configs (configs only) / own schedules
  - User cannot delete/edit other users' configs/schedules
  - Manager/admin can do everything

- [ ] **Step 4: Run tests**

```bash
pnpm jest 'actions/reports/__tests__/(config|schedule)-scope.test.ts'
```

- [ ] **Step 5: Commit**

```bash
git add actions/reports/config.ts actions/reports/schedule.ts actions/reports/__tests__/
git commit -m "fix(reports): scope config and schedule reads/mutations by role and ownership"
```

---

## Task 6: Scope dashboard task count + unified search

**Files:**
- Modify: `actions/dashboard/get-tasks-count.ts`
- Create: `actions/dashboard/__tests__/get-tasks-count.test.ts`
- Modify: `actions/fulltext/unified-search.ts`

`getTasksCount()` is currently global. Switch to user-scoped by default; admins/managers get global. (The legacy `getUsersTasksCount(userId)` callers pass a specific id — leave that signature alone, but require auth.)

`unifiedSearch` must apply per-entity scope filters. Re-use `getReportScope(user)` and merge into each query's where.

- [ ] **Step 1: Patch `get-tasks-count.ts`**

```ts
"use server";
import { prismadb } from "@/lib/prisma";
import {
  requireAuthenticated,
  AuthenticationError,
} from "@/lib/authz";

export const getTasksCount = async () => {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return 0;
    throw e;
  }
  if (user.role === "admin" || user.role === "manager") {
    return prismadb.tasks.count();
  }
  return prismadb.tasks.count({ where: { user: user.id } });
};

export const getUsersTasksCount = async (userId: string) => {
  await requireAuthenticated();
  return prismadb.tasks.count({ where: { user: userId } });
};
```

- [ ] **Step 2: Patch `unified-search.ts`**

After the `requireAuthenticated` (replace existing `getSession` block), import `getReportScope` and merge:

```ts
const user = await requireAuthenticated();
const scope = getReportScope(user);

const kwAccounts = await prismadb.crm_Accounts.findMany({
  where: { name: { search: query }, ...scope.account },
  // ...
});

const kwLeads = await prismadb.crm_Leads.findMany({
  where: { /* existing search */, ...scope.lead },
  // ...
});

// same for crm_Contacts (scope.contact), crm_Opportunities (scope.opportunity),
// tasks (scope.task), crm_campaigns (scope.campaign).

// User directory: only include if scope.allowUserDirectory
let kwUsers: any[] = [];
if (scope.allowUserDirectory) {
  kwUsers = await prismadb.users.findMany({ /* existing */ });
}
```

- [ ] **Step 3: Tests**

`actions/dashboard/__tests__/get-tasks-count.test.ts` — three cases: 0 unauth, user gets scoped count, admin gets global count.

`unified-search` testing is tricky because of multi-entity. Add one minimal test: when role is user, the user-directory section returns empty. (Mocking 8+ Prisma calls is overkill for this PR.)

- [ ] **Step 4: Run tests, commit**

```bash
git add actions/dashboard/ actions/fulltext/ actions/dashboard/__tests__/
git commit -m "fix(reports): scope dashboard tasks count and unified search by role"
```

---

## Task 7: Scope Inngest scheduled-report sender

**Files:**
- Modify: `inngest/functions/reports/send-scheduled.ts`
- Create: `inngest/functions/reports/__tests__/send-scheduled-scope.test.ts`

Current behavior: cron-trigger fetches all active schedules and runs each one with no scope, emailing global data even though the schedule was created by a `user`. Fix: when running a schedule, build the scope from the schedule's `createdBy` user role and pass it to `getReportData`.

- [ ] **Step 1: Patch the Inngest function**

```ts
import { mapLegacyRole } from "@/lib/authz";
import { getReportScope } from "@/lib/authz";

// Inside the per-schedule loop:
const owner = await prismadb.users.findUnique({
  where: { id: schedule.createdBy },
  select: { id: true, role: true },
});
if (!owner) {
  console.warn(`[send-scheduled] skip schedule ${schedule.id}: owner missing`);
  continue;
}
const scope = getReportScope({ id: owner.id, role: mapLegacyRole(owner.role) });

const { data, headers } = await getReportData(
  schedule.reportConfig.category,
  parseFiltersFromConfig(schedule.reportConfig.filters),
  scope,
);
// ... existing email send
```

- [ ] **Step 2: Test**

Create a focused unit test that mocks Prisma + email send, asserts that for a `user`-role schedule owner the dispatcher gets a scope with non-empty `opportunity.OR`.

- [ ] **Step 3: Commit**

```bash
git add inngest/functions/reports/send-scheduled.ts inngest/functions/reports/__tests__/
git commit -m "fix(reports): scope scheduled-report data by schedule owner role"
```

---

## Task 8: Final verification

- [ ] **Step 1: Full suite**

```bash
pnpm jest 2>&1 | tail -8
```
Expected: B3 tests pass; no new failures in unrelated suites.

- [ ] **Step 2: Manual checklist (dev)**

1. As `bob` (user), `GET /api/reports/export?category=sales&format=csv` → 200, CSV contains only opportunities `bob` owns/created
2. As `bob`, `GET /api/reports/export?category=users` → 403
3. As `manager`, both → 200, full data
4. As `bob`, browser dashboard → tasks count reflects only `bob`'s tasks
5. As `manager`, dashboard tasks count is global
6. Trigger Inngest scheduled sender (via Inngest dev UI) on a user-owned schedule → email arrives with user-scoped data, not global

- [ ] **Step 3: Push and PR**

```bash
git push -u origin feat/authz-phase-b3
gh pr create --base dev --head feat/authz-phase-b3 --title "fix(security): scope reports + dashboard + unified search by role (Phase B3)" --body "..."
```

Body references: spec §6.13/§7.6/§8.15-16, audit "Global Report Export"/"Global CRM Read Actions", manual test results.

---

## Acceptance Criteria

- `getReportScope(user)` returns role-appropriate per-entity Prisma where fragments.
- All six report-category modules accept and apply `ReportScope` (user gets ownership filter; manager/admin unfiltered).
- `users` report category requires manager+ at every entry point.
- `app/api/reports/export` requires auth, gates users-category, passes scope to dispatcher.
- `actions/reports/config.ts` and `schedule.ts` apply ownership/role rules to read and mutation entry points.
- `getTasksCount()` returns scoped count for `user` role, global for manager/admin.
- `unifiedSearch` applies per-entity scope; user-directory facet is hidden from `user` role.
- Inngest scheduled sender computes scope from schedule.createdBy.role, not global.

## Out of B3 scope

- Per-category report email templates (still send the same CSV/PDF; just with scoped data).
- Inngest worker hardening for arbitrary event payload abuse (see B1 deferred work).
- Activity feed scoping (`actions/crm/activities/get-activities-by-entity.ts`) — Phase D.
- Documents listing scoping — Phase E.
- Removing `Users.is_admin` — Phase F.
