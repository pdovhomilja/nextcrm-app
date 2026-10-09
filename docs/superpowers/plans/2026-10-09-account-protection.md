# account-protection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A public plugin `account-protection` that gives each company (country + registration number) one owner, with protection windows, manager-only owner changes, owner history and a daily expiry job. It also adds four small generic core/SDK features that the plugin needs.

**Architecture:**
- Core gets four additions: a `visit` activity type, `ctx.data.activities.findForRecord`, the actor and changed fields in after-hook events, and plugin pages in the sidebar. The SDK version goes from 0.1.0 to 0.1.1; the change is additive, so `^0.1.0` plugins keep working.
- The plugin keeps all its state in the global `ctx.store` under prefixed keys.
- Two `onError: "block"` rules guard account create and update. After hooks maintain the index and history. Two crons expire registrations and send manager emails. Server components render the tab, panel, page and admin section.

**Tech Stack:** Next.js 16 (App Router, RSC), Prisma 7 + PostgreSQL, Inngest, zod 4, jest, `@nextcrm/plugin-sdk` (in-repo package).

**Spec:** `docs/superpowers/specs/2026-10-09-account-protection-design.md`

## Global Constraints

- **Generic and off by default:**
  - nothing OXO-specific in code;
  - every value OXO needs is a setting (protection 90 days, contact deadline 30 days, contact types `visit,meeting`, warning window 7 days, default country `CZ`, require number off).
- **Plugin imports** only `@nextcrm/plugin-sdk`, its own files, `react`, `zod` and npm packages; no `@/…` imports (`__tests__/plugins/boundaries.test.ts`). Core never imports `@/plugins/…`.
- **No protection logic in core.** The § 3 additions are generic.
- **Messages** in `en`, `cz`, `de` and `uk` with identical keys (`__tests__/plugins/contract.test.ts`).
- **Rule options:** every rule is registered with `{ onError: "block" }`; the SDK default is `allow`.
- **Versions:** SDK becomes `0.1.1`. The plugin declares `sdk: "^0.1.1"` and `version: "0.1.0"`.
- **Dates:**
  - stored as ISO strings in UTC;
  - day keys are `YYYY-MM-DD` in UTC;
  - shown with `formatDay` (UTC, `en` → `en-GB`, `cz` → `cs`).
- **Fresh worktree setup**, before tsc and the full suite: `pnpm install --frozen-lockfile --prefer-offline`, then `DATABASE_URL=postgresql://x:x@localhost:5432/x pnpm exec prisma generate`.
- **Known baseline failures** (ignore when they fail): `__tests__/enrichment/enrich-contact-job.test.ts`, `__tests__/enrichment/enrich-target-job.test.ts`, `inngest/functions/calendar/__tests__/google-sync-classify.test.ts` and `__tests__/invoices/lifecycle.test.ts` (needs a live DB).
- **Commits** end with `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`. Never `git add -A`; add the files listed per task.
- **`next dev` rewrites `AGENTS.md`.** Run `git checkout -- AGENTS.md` before committing.

## Rulings (deviations from the spec, decided while planning)

1. **Nav item takes a label only, no icon.** `page({ nav: { label } })`. Lucide components cannot cross the server/client boundary, so every plugin page sits in one "Plugins" sidebar group with one icon.
2. **The `visit` label is hard-coded English.** The activity form hard-codes its labels ("Call", "Meeting", …) in `components/crm/activities/ActivityForm.tsx` today. "Visit" is added the same way, with no locale keys. Translating the form is out of scope.
3. **Extra store key `acct:<accountId>` → `{ key }`.** Without it, a number change or delete can't find the old `num:` key. The spec table missed it.
4. **History is independent of registrations.** `from` is the `to` of the account's last `hist:` entry, so owner changes on accounts without a number are recorded too (rule 6: every change).
5. **Cross-field setting checks happen in code.** The platform validates settings field by field, so an object-level zod refine never runs. Code uses `min(contactDays, protectionDays)` and ignores unknown names in `contactTypes`.
6. **Notices only for reps.** A `notice:` is queued only when the blocked actor is a user or token with role `user`.
   - A manager or admin sees `rules.protected` or `rules.exists`.
   - An owner re-creating their own account sees `rules.ownAccount`. No email is sent in either case.
7. **"Managers" means role `manager` plus `admin`** for every notification (`roles: ["manager", "admin"]`).

## Review Focus

1. **The same company typed differently** must give the same key, so the duplicate check catches it:
   - `270 824 40` and `27082440`;
   - `123` and `00000123` with CZ;
   - `billing_country` "CZ", "Czechia", "Česko", "Czech Republic", or empty with default CZ.
   
   Test in Task 5.
2. **A rep saves the edit form without touching the owner.** `update-account.ts` sends every field, `assigned_to` included, so this must not be rejected as an owner change. Test in Task 6.
3. **Clearing the owner in a form** sends `""`, not `null`. It must count as "no owner" in the rules and hooks. Tests in Tasks 6 and 7.
4. **Registered at 14:00, job runs at 06:00 on the deadline day:** the account must not lose its owner early. It expires in the next day's run. Test in Task 8.
5. **A repeated after-hook event** (Inngest retry) must not double the history or restart protection. Test in Task 7.

---

## File Structure

```
prisma/schema.prisma                                   enum crm_Activity_Type + visit
prisma/migrations/20261010000000_activity_type_visit/migration.sql
actions/crm/activities/create-activity.ts              type union + visit
actions/crm/activities/get-activities-by-entity.ts     type union + visit
components/crm/activities/ActivityForm.tsx             Visit option
lib/mcp/tools/crm-activities.ts                        zod enums + visit
lib/mcp/__tests__/crm-activities-visit.test.ts         new

packages/plugin-sdk/src/version.ts                     SDK_VERSION 0.1.1
packages/plugin-sdk/src/types.ts                       ActivityQuery, ActivitiesApi, AfterInput.actor/changed, page nav
packages/plugin-sdk/src/testing.ts                     findForRecord in test context
lib/plugins/data-api.ts                                findForRecord
lib/plugins/__tests__/data-api-activities.test.ts      new
lib/plugins/prisma-extension.ts                        actor + changed in after events
lib/plugins/__tests__/prisma-extension.test.ts         updated + new cases
lib/plugins/nav.ts                                     getPluginNavItems (new)
lib/plugins/__tests__/nav.test.ts                      new
app/[locale]/(routes)/layout.tsx                       passes pluginNav
app/[locale]/(routes)/components/app-sidebar.tsx       Plugins group
locales/{en,cz,de,uk}.json                             ModuleMenu.plugins
__tests__/plugins/contract.test.ts                     nav labels need en keys

plugins/account-protection/plugin.ts                   definition
plugins/account-protection/settings.ts                 schema, Settings, Ctx, contactTypes()
plugins/account-protection/key.ts                      countryCode, numberKey
plugins/account-protection/state.ts                    Registration maths, summarize, formatDay
plugins/account-protection/store.ts                    keys + store helpers
plugins/account-protection/rules.ts                    beforeCreate, beforeUpdate
plugins/account-protection/hooks.ts                    onCreated, onUpdated, onDeleted, indexNumber, recordOwner
plugins/account-protection/jobs.ts                     expire, sendNotices, install
plugins/account-protection/ui/common.ts                loadSummary, summaryText, liveContact
plugins/account-protection/ui/ProtectionTab.tsx
plugins/account-protection/ui/ProtectionPanel.tsx
plugins/account-protection/ui/ExpiringPage.tsx
plugins/account-protection/ui/ConflictsSection.tsx
plugins/account-protection/messages/{en,cz,de,uk}.json
plugins/account-protection/__tests__/{key,state,rules,hooks,jobs,plugin}.test.ts
lib/plugins/plugins.generated.ts                       regenerated
```

---

### Task 1: Core — `visit` activity type

**Files:**
- Modify: `prisma/schema.prisma:651-656`
- Create: `prisma/migrations/20261010000000_activity_type_visit/migration.sql`
- Modify: `actions/crm/activities/create-activity.ts:16`, `actions/crm/activities/get-activities-by-entity.ts:14`
- Modify: `components/crm/activities/ActivityForm.tsx:25,68-69,133-136`
- Modify: `lib/mcp/tools/crm-activities.ts:24,82`
- Test: `lib/mcp/__tests__/crm-activities-visit.test.ts`

**Interfaces:**
- Produces: activity `type` value `"visit"`, accepted by Prisma, server actions, the form and the MCP tools.

- [ ] **Step 1: Set up the fresh worktree**

Run: `pnpm install --frozen-lockfile --prefer-offline && DATABASE_URL=postgresql://x:x@localhost:5432/x pnpm exec prisma generate`
Expected: both finish without errors.

- [ ] **Step 2: Write the failing test**

`lib/mcp/__tests__/crm-activities-visit.test.ts`:
```ts
jest.mock("@/lib/prisma", () => ({ prismadb: {} }));
jest.mock("@/lib/crm/calendar/outbound-emit", () => ({ emitCalendarOutbound: jest.fn() }));

import { crmActivityTools } from "@/lib/mcp/tools/crm-activities";

const tool = (name: string) => crmActivityTools.find((t) => t.name === name)!;

it("accepts the visit type when listing and creating activities", () => {
  expect(tool("crm_list_activities").schema.safeParse({ type: "visit" }).success).toBe(true);
  const create = tool("crm_create_activity").schema.safeParse({ type: "visit", title: "Visit", date: new Date().toISOString(), links: [] });
  expect(create.error?.issues.find((i) => i.path[0] === "type")).toBeUndefined();
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm exec jest lib/mcp/__tests__/crm-activities-visit.test.ts`
Expected: FAIL. `success` is `false` for `crm_list_activities`, and a `type` issue is reported for create.

- [ ] **Step 4: Implement**

`prisma/schema.prisma`, enum `crm_Activity_Type`:
```prisma
enum crm_Activity_Type {
  call
  meeting
  note
  email
  visit
}
```
`prisma/migrations/20261010000000_activity_type_visit/migration.sql`:
```sql
ALTER TYPE "crm_Activity_Type" ADD VALUE 'visit';
```
In `actions/crm/activities/create-activity.ts:16` and `actions/crm/activities/get-activities-by-entity.ts:14`, change the union to:
```ts
  type: "call" | "meeting" | "note" | "email" | "visit";
```
In `components/crm/activities/ActivityForm.tsx`:
```ts
type ActivityType = "call" | "meeting" | "note" | "email" | "visit";
```
```ts
  const showDuration = type === "call" || type === "meeting" || type === "visit";
  const showOutcome = type === "call" || type === "meeting" || type === "visit";
```
and add after the Meeting item:
```tsx
                <SelectItem value="visit">Visit</SelectItem>
```
In `lib/mcp/tools/crm-activities.ts`, lines 24 and 82, replace `["call", "meeting", "note", "email"]` with `["call", "meeting", "note", "email", "visit"]`. Change the description at line 80 to `"Create a CRM activity (call/meeting/note/email/visit) and link to entities"`.

Then run: `DATABASE_URL=postgresql://x:x@localhost:5432/x pnpm exec prisma generate`

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm exec jest lib/mcp/__tests__/crm-activities-visit.test.ts && pnpm exec tsc --noEmit`
Expected: PASS, and tsc reports no errors.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20261010000000_activity_type_visit actions/crm/activities/create-activity.ts actions/crm/activities/get-activities-by-entity.ts components/crm/activities/ActivityForm.tsx lib/mcp/tools/crm-activities.ts lib/mcp/__tests__/crm-activities-visit.test.ts
git commit -m "feat(activities): visit activity type"
```

---

### Task 2: SDK — `activities.findForRecord`

**Files:**
- Modify: `packages/plugin-sdk/src/types.ts` (DataApi block), `packages/plugin-sdk/src/version.ts:1`, `packages/plugin-sdk/src/testing.ts:68`
- Modify: `lib/plugins/data-api.ts:89`
- Test: `lib/plugins/__tests__/data-api-activities.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface ActivityQuery { types?: string[]; status?: "scheduled" | "completed" | "cancelled"; since?: Date; take?: number; skip?: number }
  export interface ActivitiesApi extends Pick<ReadApi, "find"> {
    findForRecord(entity: Entity, id: string, query?: ActivityQuery): Promise<RecordData[]>;
  }
  // DataApi.activities: ActivitiesApi
  ```
  Results are newest `date` first, exclude soft-deleted activities, and are capped at 100.
- Test context: activity rows may carry `links: { entityType: string; entityId: string }[]`; `findForRecord` filters on them.
- `SDK_VERSION = "0.1.1"`.

- [ ] **Step 1: Write the failing test**

`lib/plugins/__tests__/data-api-activities.test.ts`:
```ts
const findMany = jest.fn(async (_args: unknown) => [{ id: "act-1" }]);
jest.mock("@/lib/prisma", () => ({ prismadb: { crm_Activities: { findMany: (a: unknown) => findMany(a) } } }));
jest.mock("@/inngest/client", () => ({ inngest: { send: jest.fn(async () => undefined) } }));
jest.mock("@/lib/plugins/log", () => ({ writePluginLog: jest.fn() }));

import { createDataApi } from "@/lib/plugins/data-api";
import { PluginPermissionError } from "@/lib/plugins/errors";
import { SDK_VERSION } from "@nextcrm/plugin-sdk";
import { createTestContext } from "@nextcrm/plugin-sdk/testing";

beforeEach(() => findMany.mockClear());

it("finds a record's activities through links, newest first, capped at 100", async () => {
  const api = createDataApi("demo", ["activities:read"]);
  const since = new Date("2026-10-01T00:00:00Z");
  await expect(api.activities.findForRecord("account", "acc-1", { types: ["visit", "meeting"], status: "completed", since, take: 500 }))
    .resolves.toEqual([{ id: "act-1" }]);
  expect(findMany).toHaveBeenCalledWith({
    where: { deletedAt: null, links: { some: { entityType: "account", entityId: "acc-1" } }, type: { in: ["visit", "meeting"] }, status: "completed", date: { gte: since } },
    orderBy: { date: "desc" },
    take: 100,
    skip: undefined,
  });
});

it("needs activities:read", async () => {
  const api = createDataApi("demo", []);
  await expect(api.activities.findForRecord("account", "acc-1")).rejects.toBeInstanceOf(PluginPermissionError);
});

it("bumps the SDK to 0.1.1", () => expect(SDK_VERSION).toBe("0.1.1"));

it("test context filters activities by link, type, status and date", async () => {
  const ctx = createTestContext({ data: { activities: [
    { id: "a1", type: "visit", status: "completed", date: "2026-10-05T10:00:00Z", links: [{ entityType: "account", entityId: "acc-1" }] },
    { id: "a2", type: "note", status: "completed", date: "2026-10-06T10:00:00Z", links: [{ entityType: "account", entityId: "acc-1" }] },
    { id: "a3", type: "visit", status: "completed", date: "2026-10-07T10:00:00Z", links: [{ entityType: "account", entityId: "acc-2" }] },
    { id: "a4", type: "visit", status: "completed", date: "2026-09-01T10:00:00Z", links: [{ entityType: "account", entityId: "acc-1" }] },
  ] } });
  const rows = await ctx.data.activities.findForRecord("account", "acc-1", { types: ["visit"], status: "completed", since: new Date("2026-10-01T00:00:00Z") });
  expect(rows.map((r) => r.id)).toEqual(["a1"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec jest lib/plugins/__tests__/data-api-activities.test.ts`
Expected: FAIL. TypeScript/runtime error: `findForRecord` is not a function, and SDK_VERSION is `0.1.0`.

- [ ] **Step 3: Implement**

`packages/plugin-sdk/src/version.ts:1`:
```ts
export const SDK_VERSION = "0.1.1";
```
`packages/plugin-sdk/src/types.ts`: add after `EntityApi`:
```ts
export interface ActivityQuery {
  types?: string[];
  status?: "scheduled" | "completed" | "cancelled";
  since?: Date;
  take?: number;
  skip?: number;
}

export interface ActivitiesApi extends Pick<ReadApi, "find"> {
  /** Activities linked to the record (crm_ActivityLinks), newest first, soft-deleted excluded, at most 100. */
  findForRecord(entity: Entity, id: string, query?: ActivityQuery): Promise<RecordData[]>;
}
```
In `DataApi`, change `activities: Pick<ReadApi, "find">;` to `activities: ActivitiesApi;`.

`lib/plugins/data-api.ts`: replace line 89 with:
```ts
    activities: {
      find: read("crm_Activities", "activities:read").find,
      async findForRecord(entityType, entityId, query = {}) {
        need("activities:read");
        const where: RecordData = { deletedAt: null, links: { some: { entityType, entityId } } };
        if (query.types?.length) where.type = { in: query.types };
        if (query.status) where.status = query.status;
        if (query.since) where.date = { gte: query.since };
        const take = Math.max(1, Math.min(query.take ?? MAX_TAKE, MAX_TAKE));
        return (await (await db()).crm_Activities.findMany({ where, orderBy: { date: "desc" }, take, skip: query.skip })) as RecordData[];
      },
    },
```
`packages/plugin-sdk/src/testing.ts`:
- import `ActivityQuery` and `Entity` from `./types`;
- replace line 68 `activities: { find: table(d.activities ?? []).find },` with `activities: activities(d.activities ?? []),`;
- add above `createTestContext`:
```ts
function activities(rows: RecordData[]) {
  return {
    find: table(rows).find,
    async findForRecord(entity: Entity, id: string, q: ActivityQuery = {}) {
      const linked = rows.filter((r) =>
        (r.links as { entityType: string; entityId: string }[] | undefined)?.some((l) => l.entityType === entity && l.entityId === id)
        && r.deletedAt == null
        && (!q.types?.length || q.types.includes(r.type as string))
        && (!q.status || r.status === q.status)
        && (!q.since || new Date(r.date as string) >= q.since));
      linked.sort((a, b) => new Date(b.date as string).getTime() - new Date(a.date as string).getTime());
      const skip = q.skip ?? 0;
      return linked.slice(skip, skip + Math.min(q.take ?? 100, 100));
    },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec jest lib/plugins/__tests__/data-api-activities.test.ts lib/plugins/__tests__/data-api.test.ts __tests__/plugins plugins/registry-ares && pnpm exec tsc --noEmit`
Expected: PASS (registry-ares `^0.1.0` still satisfied by 0.1.1), and tsc reports no errors.

- [ ] **Step 5: Commit**

```bash
git add packages/plugin-sdk/src/types.ts packages/plugin-sdk/src/version.ts packages/plugin-sdk/src/testing.ts lib/plugins/data-api.ts lib/plugins/__tests__/data-api-activities.test.ts
git commit -m "feat(plugin-sdk): activities.findForRecord, SDK 0.1.1"
```

---

### Task 3: SDK — actor and changed fields in after events

**Files:**
- Modify: `packages/plugin-sdk/src/types.ts` (`AfterInput`)
- Modify: `lib/plugins/prisma-extension.ts:8-17,36-44,61-92,107-126`
- Test: `lib/plugins/__tests__/prisma-extension.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface AfterInput {
    entity: Entity; operation: AfterOperation; recordId: string;
    actor?: Actor;          // who made the write; missing only on events sent before 0.1.1
    changed?: string[];     // updates only: keys of the update data whose value differs from the stored row (excluding "v")
  }
  ```
- `InterceptDeps` gains `resolveActor(): Promise<Actor>`. `sendAfter`'s data type becomes `AfterInput`.

- [ ] **Step 1: Write the failing tests**

In `lib/plugins/__tests__/prisma-extension.test.ts`:
- add `resolveActor: jest.fn(async () => ({ type: "system" })),` to `mkDeps`;
- change the two exact assertions at lines 40 and 78 to `{ entity: "account", operation: "created", recordId: "new", actor: { type: "system" } }`;
- add:
```ts
it("sends the actor and the changed fields on update", async () => {
  const deps = mkDeps({
    afterTargets: jest.fn(async () => ["p-one"]),
    resolveActor: jest.fn(async () => ({ type: "user", userId: "u1", role: "manager" })),
    findExisting: jest.fn(async () => ({ id: "a1", name: "Old", assigned_to: "u2", company_id: "1", deletedAt: null })),
  });
  await interceptWrite({ model: "crm_Accounts", operation: "update",
    args: { where: { id: "a1" }, data: { v: 0, name: "Old", assigned_to: "u3", company_id: "1" } }, query: async () => ({ id: "a1" }) }, deps);
  expect(deps.sendAfter).toHaveBeenCalledWith("p-one", {
    entity: "account", operation: "updated", recordId: "a1",
    actor: { type: "user", userId: "u1", role: "manager" }, changed: ["assigned_to"],
  });
});

it("sends changed fields per row on updateMany", async () => {
  const deps = mkDeps({
    afterTargets: jest.fn(async () => ["p-one"]),
    findManyExisting: jest.fn(async () => [{ id: "a1", assigned_to: "u1" }, { id: "a2", assigned_to: "u9" }]),
  });
  await interceptWrite({ model: "crm_Accounts", operation: "updateMany", args: { where: {}, data: { assigned_to: "u9" } }, query: async () => ({ count: 2 }) }, deps);
  expect(deps.sendAfter).toHaveBeenCalledWith("p-one", expect.objectContaining({ recordId: "a1", changed: ["assigned_to"] }));
  expect(deps.sendAfter).toHaveBeenCalledWith("p-one", expect.objectContaining({ recordId: "a2", changed: [] }));
});

it("does not resolve the actor when no plugin listens", async () => {
  const deps = mkDeps({ hasRules: jest.fn(async () => true), afterTargets: jest.fn(async () => []) });
  await interceptWrite({ model: "crm_Accounts", operation: "create", args: { data: {} }, query: async () => ({ id: "n" }) }, deps);
  expect(deps.resolveActor).not.toHaveBeenCalled();
});
```
If `mkDeps` has no `hasRules` key, the third test passes `hasRules` through `over` as written; keep the existing default otherwise.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec jest lib/plugins/__tests__/prisma-extension.test.ts`
Expected: FAIL. Payloads lack `actor`/`changed`, and `resolveActor` is not in `InterceptDeps` (type error).

- [ ] **Step 3: Implement**

`packages/plugin-sdk/src/types.ts`:
```ts
export interface AfterInput {
  entity: Entity;
  operation: AfterOperation;
  recordId: string;
  /** Who made the write. */
  actor?: Actor;
  /** Updates only: keys of the update data whose value differs from the stored row ("v" excluded). */
  changed?: string[];
}
```
`lib/plugins/prisma-extension.ts`:
- import `Actor` and `AfterInput` from `@nextcrm/plugin-sdk`;
- in `InterceptDeps` add `resolveActor(): Promise<Actor>;` and change `sendAfter` to `sendAfter(pluginId: string, data: AfterInput): void;`;
- add below `isSoftDelete`:
```ts
// Keys the caller sent whose value differs from the stored row; "v" is the legacy version field every core write sets.
const changedKeys = (data: RecordData | undefined, existing: RecordData | null): string[] =>
  Object.keys(data ?? {}).filter((k) => k !== "v" && JSON.stringify(data![k] ?? null) !== JSON.stringify(existing?.[k] ?? null));
```
- replace `emit` with:
```ts
  const emit = async (operation: AfterOperation, ids: string[], changed?: (id: string) => string[]) => {
    // Loop guard: a plugin's own writes never trigger its own after-actions.
    const frame = currentActorFrame()?.actor;
    const writer = frame?.type === "plugin" ? frame.pluginId : null;
    const targets = (await deps.afterTargets(entity, operation)).filter((id) => id !== writer);
    if (!targets.length) return;
    const actor = await deps.resolveActor();
    for (const pluginId of targets) {
      for (const recordId of ids) {
        deps.sendAfter(pluginId, { entity, operation, recordId, actor, ...(changed ? { changed: changed(recordId) } : {}) });
      }
    }
  };
```
- in `case "update"/"upsert"`, replace the last emit with:
```ts
      await emit(soft ? "deleted" : "updated", [(existing?.id as string) ?? row.id], soft ? undefined : () => changedKeys(input, existing));
```
- in `case "updateMany"/"deleteMany"`, replace `else await emit(...)` with:
```ts
      else if (isSoftDelete(p.args.data, null)) await emit("deleted", ids);
      else {
        const byId = new Map(rows.map((r) => [r.id as string, changedKeys(p.args.data, r)]));
        await emit("updated", ids, (id) => byId.get(id) ?? []);
      }
```
- in `withPluginRules` deps, add `resolveActor: async () => (await import("./actor")).resolveActor(),`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec jest lib/plugins && pnpm exec tsc --noEmit`
Expected: PASS, and tsc reports no errors.

- [ ] **Step 5: Commit**

```bash
git add packages/plugin-sdk/src/types.ts lib/plugins/prisma-extension.ts lib/plugins/__tests__/prisma-extension.test.ts
git commit -m "feat(plugin-sdk): actor and changed fields in after events"
```

---

### Task 4: SDK — plugin pages in the sidebar

**Files:**
- Modify: `packages/plugin-sdk/src/types.ts` (`PageRegistration`, `ExtensionBuilder.page`)
- Create: `lib/plugins/nav.ts`
- Modify: `app/[locale]/(routes)/layout.tsx:69-90,109-112`, `app/[locale]/(routes)/components/app-sidebar.tsx:79-110`
- Modify: `locales/{en,cz,de,uk}.json` (`ModuleMenu.plugins`)
- Modify: `__tests__/plugins/contract.test.ts:35`
- Test: `lib/plugins/__tests__/nav.test.ts`

**Interfaces:**
- Produces:
  - `page({ path, title, component, roles?, nav?: { label: string } })`: `label` is a key in the plugin's messages;
  - `getPluginNavItems(role: Role, locale: Locale): Promise<{ title: string; url: string }[]>` with `url = "/p/<pluginId>/<path>"`;
  - `AppSidebar` prop `pluginNav?: { title: string; url: string }[]`.

- [ ] **Step 1: Write the failing test**

`lib/plugins/__tests__/nav.test.ts`:
```ts
const enabled = jest.fn();
jest.mock("@/lib/plugins/state", () => ({ getEnabledPlugins: () => enabled() }));
jest.mock("@/lib/plugins/i18n", () => ({ translatePluginMessage: (id: string, key: string, _p: unknown, locale: string) => `${id}:${key}:${locale}` }));

import { getPluginNavItems } from "@/lib/plugins/nav";

const page = (path: string, roles: string[], nav?: { label: string }) => ({ path, title: "t", component: () => null, roles, nav });

it("lists nav pages of enabled plugins the role may open", async () => {
  enabled.mockResolvedValue([
    { definition: { id: "demo", extensions: { pages: [page("expiring", ["manager", "admin"], { label: "nav.expiring" }), page("hidden", ["user", "manager", "admin"])] } } },
  ]);
  await expect(getPluginNavItems("manager", "cz")).resolves.toEqual([{ title: "demo:nav.expiring:cz", url: "/p/demo/expiring" }]);
  await expect(getPluginNavItems("user", "en")).resolves.toEqual([]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec jest lib/plugins/__tests__/nav.test.ts`
Expected: FAIL with "Cannot find module '@/lib/plugins/nav'".

- [ ] **Step 3: Implement**

`packages/plugin-sdk/src/types.ts`:
```ts
export interface PageRegistration { path: string; title: string; component: ServerComponent<PageProps<any, any>>; roles: Role[]; nav?: { label: string } }
```
and in `ExtensionBuilder`:
```ts
  page(page: { path: string; title: string; component: ServerComponent<PageProps<S, K>>; roles?: Role[]; nav?: { label: string } }): void;
```
(`define.ts` spreads the page object, so `nav` passes through unchanged.)

`lib/plugins/nav.ts`:
```ts
import type { Locale, Role } from "@nextcrm/plugin-sdk";
import { getEnabledPlugins } from "./state";
import { translatePluginMessage } from "./i18n";

export async function getPluginNavItems(role: Role, locale: Locale): Promise<{ title: string; url: string }[]> {
  const out: { title: string; url: string }[] = [];
  for (const plugin of await getEnabledPlugins()) {
    const id = plugin.definition.id;
    for (const page of plugin.definition.extensions.pages) {
      if (!page.nav || !page.roles.includes(role)) continue;
      out.push({ title: translatePluginMessage(id, page.nav.label, undefined, locale), url: `/p/${id}/${page.path}` });
    }
  }
  return out;
}
```
`app/[locale]/(routes)/layout.tsx`:
- add `plugins: dict("plugins"),` to `translations`;
- before `return`, add:
```ts
  const { getPluginNavItems } = await import("@/lib/plugins/nav");
  const { mapLegacyRole } = await import("@/lib/authz/roles");
  const { getLocale } = await import("next-intl/server");
  const pluginNav = await getPluginNavItems(mapLegacyRole(user?.role as string), (await getLocale()) as "en" | "cz" | "de" | "uk");
```
- pass `pluginNav={pluginNav}` to `<AppSidebar>`.

`app/[locale]/(routes)/components/app-sidebar.tsx`:
- `import { Puzzle } from "lucide-react";`;
- add `pluginNav?: { title: string; url: string }[];` to `AppSidebarProps` and destructure it;
- after the `getInvoicesMenuItem` entry, before the admin block, add:
```ts
  if (pluginNav?.length) {
    navItems.push({ title: dict?.plugins || "Plugins", icon: Puzzle, items: pluginNav });
  }
```
`locales/*.json`, inside `"ModuleMenu"`: add `"plugins"` with values `en` "Plugins", `cz` "Pluginy", `de` "Plugins", `uk` "Плагіни".

`__tests__/plugins/contract.test.ts:35`: include nav labels in the title check:
```ts
  const titles = [...d.extensions.accountTabs.map((t) => t.title), ...d.extensions.pages.map((pg) => pg.title), ...d.extensions.pages.flatMap((pg) => (pg.nav ? [pg.nav.label] : []))];
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec jest lib/plugins/__tests__/nav.test.ts __tests__/plugins lib/plugins/__tests__/i18n.test.ts && pnpm exec tsc --noEmit`
Expected: PASS, and tsc reports no errors. If `mapLegacyRole`'s parameter type differs, adapt the cast to its signature (`lib/authz/roles.ts:12`).

- [ ] **Step 5: Commit**

```bash
git add packages/plugin-sdk/src/types.ts lib/plugins/nav.ts lib/plugins/__tests__/nav.test.ts "app/[locale]/(routes)/layout.tsx" "app/[locale]/(routes)/components/app-sidebar.tsx" locales/en.json locales/cz.json locales/de.json locales/uk.json __tests__/plugins/contract.test.ts
git commit -m "feat(plugin-sdk): plugin pages in the sidebar"
```

---

### Task 5: Plugin core logic — settings, number key, registration maths

**Files:**
- Create: `plugins/account-protection/settings.ts`, `plugins/account-protection/key.ts`, `plugins/account-protection/state.ts`
- Test: `plugins/account-protection/__tests__/key.test.ts`, `plugins/account-protection/__tests__/state.test.ts`

No `plugin.ts` yet, so the registry generator and the contract test ignore the directory until Task 6.

**Interfaces:**
- Produces (`settings.ts`):
  ```ts
  export const ACTIVITY_TYPES = ["call", "meeting", "note", "email", "visit"] as const;
  export const settingsSchema: z.ZodObject<...>;   // fields below
  export type Settings = { protectionDays: number; contactDays: number; contactTypes: string; warnDays: number; defaultCountry: string; requireNumber: boolean };
  export type Ctx = PluginContext<Settings>;
  export function contactTypes(setting: string): string[];
  ```
- Produces (`key.ts`):
  ```ts
  export function countryCode(raw: unknown, fallback: string): string;
  export function numberKey(account: { company_id?: unknown; billing_country?: unknown }, defaultCountry: string): string | null;  // "CC:NUMBER"
  ```
- Produces (`state.ts`):
  ```ts
  export interface Registration { key: string; ownerId: string; registeredAt: string; contactDeadline: string; protectedUntil: string; contactAt?: string }
  export function isoDay(d: Date | string): string;                       // "YYYY-MM-DD", UTC
  export function newRegistration(key: string, ownerId: string, at: Date, s: Pick<Settings, "protectionDays" | "contactDays">): Registration;
  export function dueDay(r: Registration): string;                       // earlier of contactDeadline (if no contactAt) and protectedUntil
  export type Verdict = "keep" | "check-contact" | "expired";
  export function evaluate(r: Registration, now: Date): Verdict;
  export type Summary = { kind: "noNumber" } | { kind: "free" } | { kind: "contactNeeded"; date: string } | { kind: "protected"; date: string };
  export function summarize(hasKey: boolean, reg: Registration | null, contactAt: string | null): Summary;
  export function formatDay(iso: string, locale: string): string;        // UTC; en → en-GB, cz → cs
  ```

- [ ] **Step 1: Write the failing tests**

`plugins/account-protection/__tests__/key.test.ts`:
```ts
import { countryCode, numberKey } from "../key";

it.each([
  ["CZ", "CZ"], ["cz", "CZ"], ["Czechia", "CZ"], ["Česko", "CZ"], ["Czech Republic", "CZ"], ["Tschechien", "CZ"], ["Чехія", "CZ"],
  ["Germany", "DE"], ["  Slovakia ", "SK"], ["", "CZ"], [null, "CZ"], ["Atlantis", "CZ"], ["XX", "CZ"],
])("countryCode(%p) → %s", (raw, cc) => expect(countryCode(raw, "CZ")).toBe(cc));

it("builds the same key for the same company typed differently (Review Focus 1)", () => {
  const k = "CZ:27082440";
  expect(numberKey({ company_id: "270 824 40", billing_country: "Czechia" }, "CZ")).toBe(k);
  expect(numberKey({ company_id: "27082440", billing_country: "CZ" }, "CZ")).toBe(k);
  expect(numberKey({ company_id: "27082440", billing_country: "" }, "CZ")).toBe(k);
  expect(numberKey({ company_id: "27082440", billing_country: "Czech Republic" }, "CZ")).toBe(k);
  expect(numberKey({ company_id: "123", billing_country: "CZ" }, "CZ")).toBe("CZ:00000123");
});

it("keeps foreign numbers as typed, upper-cased and without spaces", () => {
  expect(numberKey({ company_id: "hrb 1234", billing_country: "Germany" }, "CZ")).toBe("DE:HRB1234");
});

it("returns null without a registration number", () => {
  expect(numberKey({ company_id: "   ", billing_country: "CZ" }, "CZ")).toBeNull();
  expect(numberKey({ company_id: null }, "CZ")).toBeNull();
  expect(numberKey({}, "CZ")).toBeNull();
});
```
`plugins/account-protection/__tests__/state.test.ts`:
```ts
import { contactTypes, settingsSchema } from "../settings";
import { dueDay, evaluate, formatDay, isoDay, newRegistration, summarize } from "../state";

const S = settingsSchema.parse({});
const at = new Date("2026-10-01T14:00:00Z");

it("has the documented defaults", () => {
  expect(S).toEqual({ protectionDays: 90, contactDays: 30, contactTypes: "visit,meeting", warnDays: 7, defaultCountry: "CZ", requireNumber: false });
});

it("parses contact types and ignores unknown names", () => {
  expect(contactTypes(" visit, meeting ,sample,,call ")).toEqual(["visit", "meeting", "call"]);
});

it("computes windows and the first due day", () => {
  const r = newRegistration("CZ:1", "u1", at, S);
  expect(r).toEqual({ key: "CZ:1", ownerId: "u1", registeredAt: "2026-10-01T14:00:00.000Z",
    contactDeadline: "2026-10-31T14:00:00.000Z", protectedUntil: "2026-12-30T14:00:00.000Z" });
  expect(dueDay(r)).toBe("2026-10-31");
  expect(dueDay({ ...r, contactAt: "2026-10-10T09:00:00.000Z" })).toBe("2026-12-30");
});

it("clamps the contact deadline to the protection window", () => {
  const r = newRegistration("CZ:1", "u1", at, { protectionDays: 10, contactDays: 30 });
  expect(r.contactDeadline).toBe(r.protectedUntil);
});

it("does not expire before the exact deadline time (Review Focus 4)", () => {
  const r = newRegistration("CZ:1", "u1", at, S);
  expect(evaluate(r, new Date("2026-10-31T06:00:00Z"))).toBe("keep");
  expect(evaluate(r, new Date("2026-11-01T06:00:00Z"))).toBe("check-contact");
  expect(evaluate({ ...r, contactAt: "2026-10-05T00:00:00Z" }, new Date("2026-11-01T06:00:00Z"))).toBe("keep");
  expect(evaluate({ ...r, contactAt: "2026-10-05T00:00:00Z" }, new Date("2026-12-31T06:00:00Z"))).toBe("expired");
});

it("summarizes for the panel", () => {
  const r = newRegistration("CZ:1", "u1", at, S);
  expect(summarize(false, null, null)).toEqual({ kind: "noNumber" });
  expect(summarize(true, null, null)).toEqual({ kind: "free" });
  expect(summarize(true, r, null)).toEqual({ kind: "contactNeeded", date: r.contactDeadline });
  expect(summarize(true, r, "2026-10-05T00:00:00Z")).toEqual({ kind: "protected", date: r.protectedUntil });
});

it("formats days in UTC per locale", () => {
  expect(isoDay("2026-12-30T23:30:00.000Z")).toBe("2026-12-30");
  expect(formatDay("2027-01-12T23:30:00.000Z", "en")).toBe("12 Jan 2027");
  expect(formatDay("2027-01-12T23:30:00.000Z", "cz")).toBe("12. 1. 2027");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec jest plugins/account-protection`
Expected: FAIL with "Cannot find module '../key'" (and `../settings`, `../state`).

- [ ] **Step 3: Implement**

`plugins/account-protection/settings.ts`:
```ts
import { z, type PluginContext } from "@nextcrm/plugin-sdk";

export const ACTIVITY_TYPES = ["call", "meeting", "note", "email", "visit"] as const;

export const settingsSchema = z.object({
  protectionDays: z.number().int().min(1).default(90),
  contactDays: z.number().int().min(1).default(30),
  contactTypes: z.string().default("visit,meeting"),
  warnDays: z.number().int().min(1).default(7),
  defaultCountry: z.string().length(2).default("CZ"),
  requireNumber: z.boolean().default(false),
});

export type Settings = z.infer<typeof settingsSchema>;
export type Ctx = PluginContext<Settings>;

// The platform validates settings field by field, so unknown names are dropped here (Ruling 5).
export function contactTypes(setting: string): string[] {
  return setting.split(",").map((t) => t.trim()).filter((t) => (ACTIVITY_TYPES as readonly string[]).includes(t));
}
```
`plugins/account-protection/key.ts`:
```ts
const NAME_LOCALES = ["en", "cs", "de", "uk"];
// Older names Intl no longer returns.
const ALIASES: Record<string, string> = { "czech republic": "CZ", "česká republika": "CZ" };

let table: { codes: Set<string>; byName: Map<string, string> } | null = null;

function regions() {
  if (table) return table;
  const codes = new Set<string>();
  const byName = new Map<string, string>(Object.entries(ALIASES));
  const names = NAME_LOCALES.map((l) => new Intl.DisplayNames([l], { type: "region", fallback: "none" }));
  for (let a = 65; a <= 90; a++) {
    for (let b = 65; b <= 90; b++) {
      const code = String.fromCharCode(a, b);
      const found = names.map((n) => { try { return n.of(code); } catch { return undefined; } });
      if (!found.some(Boolean)) continue;
      codes.add(code);
      for (const name of found) if (name) byName.set(name.toLocaleLowerCase(), code);
    }
  }
  table = { codes, byName };
  return table;
}

export function countryCode(raw: unknown, fallback: string): string {
  const def = fallback.toUpperCase();
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return def;
  if (/^[A-Za-z]{2}$/.test(s)) return regions().codes.has(s.toUpperCase()) ? s.toUpperCase() : def;
  return regions().byName.get(s.toLocaleLowerCase()) ?? def;
}

export function numberKey(account: { company_id?: unknown; billing_country?: unknown }, defaultCountry: string): string | null {
  const raw = typeof account.company_id === "string" ? account.company_id.replace(/\s+/g, "").toUpperCase() : "";
  if (!raw) return null;
  const cc = countryCode(account.billing_country, defaultCountry);
  const number = cc === "CZ" && /^\d{1,8}$/.test(raw) ? raw.padStart(8, "0") : raw;
  return `${cc}:${number}`;
}
```
Note: `"XX"` must map to the default. If `Intl.DisplayNames` returns a name for `XX` in this Node build, the `countryCode` test shows it; then exclude codes whose English name equals the code itself.

`plugins/account-protection/state.ts`:
```ts
import type { Settings } from "./settings";

const DAY = 86_400_000;

export interface Registration {
  key: string;
  ownerId: string;
  registeredAt: string;
  contactDeadline: string;
  protectedUntil: string;
  contactAt?: string;
}

export const isoDay = (d: Date | string) => new Date(d).toISOString().slice(0, 10);

export function newRegistration(key: string, ownerId: string, at: Date, s: Pick<Settings, "protectionDays" | "contactDays">): Registration {
  const contactDays = Math.min(s.contactDays, s.protectionDays);   // Ruling 5
  return {
    key,
    ownerId,
    registeredAt: at.toISOString(),
    contactDeadline: new Date(at.getTime() + contactDays * DAY).toISOString(),
    protectedUntil: new Date(at.getTime() + s.protectionDays * DAY).toISOString(),
  };
}

export function dueDay(r: Registration): string {
  return isoDay(!r.contactAt && r.contactDeadline < r.protectedUntil ? r.contactDeadline : r.protectedUntil);
}

export type Verdict = "keep" | "check-contact" | "expired";

export function evaluate(r: Registration, now: Date): Verdict {
  if (now.getTime() >= Date.parse(r.protectedUntil)) return "expired";
  if (!r.contactAt && now.getTime() >= Date.parse(r.contactDeadline)) return "check-contact";
  return "keep";
}

export type Summary =
  | { kind: "noNumber" }
  | { kind: "free" }
  | { kind: "contactNeeded"; date: string }
  | { kind: "protected"; date: string };

export function summarize(hasKey: boolean, reg: Registration | null, contactAt: string | null): Summary {
  if (!hasKey) return { kind: "noNumber" };
  if (!reg) return { kind: "free" };
  if (!contactAt && reg.contactDeadline < reg.protectedUntil) return { kind: "contactNeeded", date: reg.contactDeadline };
  return { kind: "protected", date: reg.protectedUntil };
}

const INTL_LOCALE: Record<string, string> = { en: "en-GB", cz: "cs", de: "de", uk: "uk" };

export function formatDay(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale] ?? "en-GB", { day: "numeric", month: locale === "cz" ? "numeric" : "short", year: "numeric", timeZone: "UTC" })
    .format(new Date(iso));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec jest plugins/account-protection && pnpm exec tsc --noEmit`
Expected: PASS, and tsc reports no errors. If the `cz` date format in this Node's ICU differs (e.g. `12.1.2027`), assert the actual ICU output and note it in the ledger. The format comes from ICU, not from our code.

- [ ] **Step 5: Commit**

```bash
git add plugins/account-protection/settings.ts plugins/account-protection/key.ts plugins/account-protection/state.ts plugins/account-protection/__tests__/key.test.ts plugins/account-protection/__tests__/state.test.ts
git commit -m "feat(account-protection): number key, settings and registration maths"
```

---

### Task 6: Plugin — store helpers, rules, definition and messages

**Files:**
- Create: `plugins/account-protection/store.ts`, `plugins/account-protection/rules.ts`, `plugins/account-protection/plugin.ts`
- Create: `plugins/account-protection/messages/{en,cz,de,uk}.json`
- Modify: `lib/plugins/plugins.generated.ts` (regenerated)
- Test: `plugins/account-protection/__tests__/rules.test.ts`, `plugins/account-protection/__tests__/plugin.test.ts`

`plugin.ts` in this task registers only the settings and the two rules. Task 7 adds the after hooks, Task 8 the crons and `onInstall`, Task 9 the slots.

**Interfaces:**
- Consumes: `numberKey` (key.ts), `Registration`, `formatDay`, `dueDay` (state.ts), `Ctx`, `settingsSchema` (settings.ts).
- Produces (`store.ts`):
  ```ts
  export const K: { num(key: string): string; acct(id: string): string; reg(id: string): string; due(day: string, id: string): string;
    hist(id: string, at: string): string; freed(day: string, id: string): string; notice(at: string, rand: string): string; conflict(id: string): string };
  export type Reason = "created" | "assigned" | "released" | "expired" | "expired-no-contact" | "install";
  export interface HistoryEntry { at: string; from: string | null; to: string | null; byUserId: string | null; byType: Actor["type"]; reason: Reason }
  export interface Notice { at: string; kind: "blocked-protected" | "blocked-free"; userId: string | null; accountId: string }
  export function startRegistration(store: RecordStore, accountId: string, reg: Registration): Promise<void>;
  export function clearRegistration(store: RecordStore, accountId: string): Promise<Registration | null>;
  export function addHistory(store: RecordStore, accountId: string, entry: HistoryEntry): Promise<void>;
  export function lastHistory(store: RecordStore, accountId: string): Promise<HistoryEntry | null>;
  export function queueNotice(store: RecordStore, n: Omit<Notice, "at">, now: Date): Promise<void>;
  ```
- Produces (`rules.ts`):
  ```ts
  export const isRep: (a: Actor) => boolean;            // user/token with role "user"
  export const userIdOf: (a: Actor) => string | null;
  export const ownerOf: (v: unknown) => string | null;  // "" / null / undefined → null
  export function beforeCreate(input: RuleInput, ctx: Ctx): Promise<RuleResult>;
  export function beforeUpdate(input: RuleInput, ctx: Ctx): Promise<RuleResult>;
  ```
- Rejection message keys: `rules.protected` (`{ until }`), `rules.alreadyInCrm`, `rules.exists`, `rules.ownAccount`, `rules.numberRequired`, `rules.ownerManagersOnly`.

- [ ] **Step 1: Write the failing tests**

`plugins/account-protection/__tests__/rules.test.ts`:
```ts
import type { Actor, RuleInput } from "@nextcrm/plugin-sdk";
import { createTestContext } from "@nextcrm/plugin-sdk/testing";
import { beforeCreate, beforeUpdate } from "../rules";
import { settingsSchema, type Ctx } from "../settings";
import { K } from "../store";
import { newRegistration } from "../state";

const rep: Actor = { type: "user", userId: "rep1", role: "user" };
const rep2: Actor = { type: "user", userId: "rep2", role: "user" };
const manager: Actor = { type: "user", userId: "m1", role: "manager" };
const plugin: Actor = { type: "plugin", pluginId: "account-protection" };

async function ctxWith(actor: Actor, opts: { protectedBy?: string; requireNumber?: boolean } = {}) {
  const ctx = createTestContext({ pluginId: "account-protection", actor, settings: settingsSchema.parse({ requireNumber: opts.requireNumber ?? false }) }) as unknown as Ctx & { store: Ctx["store"] };
  await ctx.store.set(K.num("CZ:27082440"), { accountId: "acc-1" });
  await ctx.store.set(K.acct("acc-1"), { key: "CZ:27082440" });
  if (opts.protectedBy) await ctx.store.set(K.reg("acc-1"), newRegistration("CZ:27082440", opts.protectedBy, new Date("2026-10-01T00:00:00Z"), settingsSchema.parse({})));
  return ctx;
}
const create = (data: Record<string, unknown>): RuleInput => ({ entity: "account", operation: "beforeCreate", recordId: null, data, existing: null });
const update = (data: Record<string, unknown>, existing: Record<string, unknown>): RuleInput => ({ entity: "account", operation: "beforeUpdate", recordId: existing.id as string, data, existing });
const notices = async (ctx: Ctx) => (await ctx.store.list("notice:")).map((e) => e.value);

it("rejects a protected number for another rep and queues a notice", async () => {
  const ctx = await ctxWith(rep2, { protectedBy: "rep1" });
  await expect(beforeCreate(create({ name: "Alza", company_id: "270 824 40", billing_country: "Czechia" }), ctx))
    .resolves.toEqual({ kind: "reject", messageKey: "rules.protected", params: { until: "30 Dec 2026" } });
  expect(await notices(ctx)).toEqual([expect.objectContaining({ kind: "blocked-protected", userId: "rep2", accountId: "acc-1" })]);
});

it("rejects a free number with alreadyInCrm for reps and exists for managers", async () => {
  const r = await ctxWith(rep2);
  await expect(beforeCreate(create({ company_id: "27082440" }), r)).resolves.toMatchObject({ messageKey: "rules.alreadyInCrm" });
  expect(await notices(r)).toEqual([expect.objectContaining({ kind: "blocked-free" })]);
  const m = await ctxWith(manager);
  await expect(beforeCreate(create({ company_id: "27082440" }), m)).resolves.toMatchObject({ messageKey: "rules.exists" });
  expect(await notices(m)).toEqual([]);
});

it("tells the owner they already have it, without a notice", async () => {
  const ctx = await ctxWith(rep, { protectedBy: "rep1" });
  await expect(beforeCreate(create({ company_id: "27082440" }), ctx)).resolves.toMatchObject({ messageKey: "rules.ownAccount" });
  expect(await notices(ctx)).toEqual([]);
});

it("allows a new number and an account without one unless required", async () => {
  const ctx = await ctxWith(rep);
  await expect(beforeCreate(create({ company_id: "12345678" }), ctx)).resolves.toEqual({ kind: "allow" });
  await expect(beforeCreate(create({ company_id: "" }), ctx)).resolves.toEqual({ kind: "allow" });
  const req = await ctxWith(rep, { requireNumber: true });
  await expect(beforeCreate(create({ company_id: " " }), req)).resolves.toMatchObject({ messageKey: "rules.numberRequired" });
  const reqM = await ctxWith(manager, { requireNumber: true });
  await expect(beforeCreate(create({}), reqM)).resolves.toEqual({ kind: "allow" });
});

it("lets only managers, admins, the system and plugins change the owner", async () => {
  const existing = { id: "acc-1", company_id: "27082440", assigned_to: "rep1" };
  await expect(beforeUpdate(update({ assigned_to: "rep2" }, existing), await ctxWith(rep))).resolves.toMatchObject({ messageKey: "rules.ownerManagersOnly" });
  await expect(beforeUpdate(update({ assigned_to: "" }, existing), await ctxWith(rep))).resolves.toMatchObject({ messageKey: "rules.ownerManagersOnly" });
  await expect(beforeUpdate(update({ assigned_to: "rep2" }, existing), await ctxWith(manager))).resolves.toEqual({ kind: "allow" });
  await expect(beforeUpdate(update({ assigned_to: null }, existing), await ctxWith(plugin))).resolves.toEqual({ kind: "allow" });
  await expect(beforeUpdate(update({ assigned_to: "rep2" }, existing), await ctxWith({ type: "system" }))).resolves.toEqual({ kind: "allow" });
});

it("allows a rep's full-form save that keeps the owner (Review Focus 2 and 3)", async () => {
  const ctx = await ctxWith(rep);
  const existing = { id: "acc-1", name: "Alza", company_id: "27082440", billing_country: "CZ", assigned_to: "rep1" };
  await expect(beforeUpdate(update({ v: 0, name: "Alza 2", company_id: "27082440", billing_country: "CZ", assigned_to: "rep1" }, existing), ctx)).resolves.toEqual({ kind: "allow" });
  const unowned = { ...existing, assigned_to: null };
  await expect(beforeUpdate(update({ name: "Alza 3", assigned_to: "" }, unowned), ctx)).resolves.toEqual({ kind: "allow" });
});

it("rejects changing the number to one another account holds", async () => {
  const ctx = await ctxWith(rep2, { protectedBy: "rep1" });
  const existing = { id: "acc-2", company_id: "11111111", billing_country: "CZ", assigned_to: "rep2" };
  await expect(beforeUpdate(update({ company_id: "27082440" }, existing), ctx)).resolves.toMatchObject({ messageKey: "rules.protected" });
  const self = { id: "acc-1", company_id: "27082440", billing_country: "CZ", assigned_to: "rep1" };
  await expect(beforeUpdate(update({ company_id: "270 824 40" }, self), await ctxWith(rep, { protectedBy: "rep1" }))).resolves.toEqual({ kind: "allow" });
});
```
`plugins/account-protection/__tests__/plugin.test.ts`:
```ts
import plugin from "../plugin";

it("declares its permissions, settings and blocking rules", () => {
  expect(plugin.id).toBe("account-protection");
  expect(plugin.sdk).toBe("^0.1.1");
  expect(plugin.permissions).toEqual(["accounts:read", "accounts:write", "activities:read", "users:read", "notify"]);
  expect(plugin.extensions.rules.map((r) => [r.entity, r.operation, r.onError])).toEqual([
    ["account", "beforeCreate", "block"],
    ["account", "beforeUpdate", "block"],
  ]);
  expect(Object.keys(plugin.settings.shape)).toEqual(["protectionDays", "contactDays", "contactTypes", "warnDays", "defaultCountry", "requireNumber"]);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec jest plugins/account-protection`
Expected: FAIL with "Cannot find module '../rules'" / "'../plugin'" / "'../store'".

- [ ] **Step 3: Implement**

`plugins/account-protection/store.ts`:
```ts
import type { Actor, RecordStore } from "@nextcrm/plugin-sdk";
import { dueDay, type Registration } from "./state";

export const K = {
  num: (key: string) => `num:${key}`,
  acct: (id: string) => `acct:${id}`,
  reg: (id: string) => `reg:${id}`,
  due: (day: string, id: string) => `due:${day}:${id}`,
  hist: (id: string, at: string) => `hist:${id}:${at}`,
  freed: (day: string, id: string) => `freed:${day}:${id}`,
  notice: (at: string, rand: string) => `notice:${at}:${rand}`,
  conflict: (id: string) => `conflict:${id}`,
};

export type Reason = "created" | "assigned" | "released" | "expired" | "expired-no-contact" | "install";

export interface HistoryEntry {
  at: string;
  from: string | null;
  to: string | null;
  byUserId: string | null;
  byType: Actor["type"];
  reason: Reason;
}

export interface Notice {
  at: string;
  kind: "blocked-protected" | "blocked-free";
  userId: string | null;
  accountId: string;
}

export async function startRegistration(store: RecordStore, accountId: string, reg: Registration): Promise<void> {
  await store.set(K.reg(accountId), reg);
  await store.set(K.due(dueDay(reg), accountId), {});
}

export async function clearRegistration(store: RecordStore, accountId: string): Promise<Registration | null> {
  const reg = await store.get<Registration>(K.reg(accountId));
  if (!reg) return null;
  await store.delete(K.due(dueDay(reg), accountId));
  await store.delete(K.reg(accountId));
  return reg;
}

export async function addHistory(store: RecordStore, accountId: string, entry: HistoryEntry): Promise<void> {
  await store.set(K.hist(accountId, entry.at), entry);
}

export async function lastHistory(store: RecordStore, accountId: string): Promise<HistoryEntry | null> {
  const all = await store.list(`hist:${accountId}:`);
  return all.length ? (all[all.length - 1].value as HistoryEntry) : null;
}

export async function queueNotice(store: RecordStore, n: Omit<Notice, "at">, now: Date): Promise<void> {
  const at = now.toISOString();
  await store.set(K.notice(at, Math.random().toString(36).slice(2, 8)), { ...n, at });
}
```
`plugins/account-protection/rules.ts`:
```ts
import { allow, reject, type Actor, type RuleInput, type RuleResult } from "@nextcrm/plugin-sdk";
import { numberKey } from "./key";
import { formatDay, type Registration } from "./state";
import { K, queueNotice } from "./store";
import type { Ctx } from "./settings";

export const isRep = (a: Actor) => (a.type === "user" || a.type === "token") && a.role === "user";
export const userIdOf = (a: Actor) => (a.type === "user" || a.type === "token" ? a.userId : null);
export const ownerOf = (v: unknown) => (typeof v === "string" && v ? v : null);

async function checkKey(key: string, selfId: string | null, ctx: Ctx): Promise<RuleResult> {
  const holder = await ctx.store.get<{ accountId: string }>(K.num(key));
  if (!holder || holder.accountId === selfId) return allow();
  const reg = await ctx.store.get<Registration>(K.reg(holder.accountId));
  const me = userIdOf(ctx.actor);
  if (reg && me && reg.ownerId === me) return reject("rules.ownAccount");
  if (isRep(ctx.actor)) {
    await queueNotice(ctx.store, { kind: reg ? "blocked-protected" : "blocked-free", userId: me, accountId: holder.accountId }, new Date());
  }
  if (reg) return reject("rules.protected", { until: formatDay(reg.protectedUntil, ctx.locale) });
  return reject(isRep(ctx.actor) ? "rules.alreadyInCrm" : "rules.exists");
}

export async function beforeCreate(input: RuleInput, ctx: Ctx): Promise<RuleResult> {
  const key = numberKey(input.data, ctx.settings.defaultCountry);
  if (!key) return ctx.settings.requireNumber && isRep(ctx.actor) ? reject("rules.numberRequired") : allow();
  return checkKey(key, null, ctx);
}

export async function beforeUpdate(input: RuleInput, ctx: Ctx): Promise<RuleResult> {
  const existing = input.existing ?? {};
  const data = input.data;
  if ("assigned_to" in data && ownerOf(data.assigned_to) !== ownerOf(existing.assigned_to) && isRep(ctx.actor)) {
    return reject("rules.ownerManagersOnly");
  }
  if ("company_id" in data || "billing_country" in data) {
    const before = numberKey(existing, ctx.settings.defaultCountry);
    const after = numberKey({ ...existing, ...data }, ctx.settings.defaultCountry);
    if (after && after !== before) return checkKey(after, input.recordId, ctx);
  }
  return allow();
}
```
`plugins/account-protection/plugin.ts`:
```ts
import { definePlugin } from "@nextcrm/plugin-sdk";
import { settingsSchema } from "./settings";
import { beforeCreate, beforeUpdate } from "./rules";

export default definePlugin({
  id: "account-protection",
  name: "Account protection",
  version: "0.1.0",
  sdk: "^0.1.1",
  description: "One owner per company registration number, with protection windows, owner history and a daily expiry job.",
  permissions: ["accounts:read", "accounts:write", "activities:read", "users:read", "notify"],
  settings: settingsSchema,
  extensions: (x) => {
    x.rule("account", "beforeCreate", beforeCreate, { onError: "block" });
    x.rule("account", "beforeUpdate", beforeUpdate, { onError: "block" });
  },
});
```
`plugins/account-protection/messages/en.json`:
```json
{
  "name": "Account protection",
  "rules": {
    "protected": "This company is protected until {until}.",
    "alreadyInCrm": "This company is already in the CRM. A manager has been asked to assign it to you.",
    "exists": "This company is already in the CRM.",
    "ownAccount": "You already have this company in the CRM.",
    "numberRequired": "Enter the company registration number.",
    "ownerManagersOnly": "Only a manager can change the account owner."
  },
  "tab": {
    "title": "Protection",
    "status": "Status",
    "protected": "Protected until {date}",
    "contactNeeded": "Contact needed by {date}",
    "free": "Not protected: no owner",
    "noNumber": "Not protected: no registration number",
    "contact": "Qualifying contact",
    "contactYes": "Yes, on {date}",
    "contactNo": "Not yet",
    "history": "Owner history",
    "historyEmpty": "No owner changes recorded yet.",
    "nobody": "nobody",
    "system": "system",
    "reason": { "created": "created", "assigned": "assigned", "released": "released", "expired": "protection expired", "expired-no-contact": "no contact in time", "install": "plugin installed" }
  },
  "expiring": {
    "title": "Expiring protection",
    "nav": "Expiring protection",
    "due": "Due within {days} days",
    "freed": "Freed in the last 7 days",
    "empty": "Nothing here."
  },
  "admin": {
    "conflicts": "Accounts sharing a registration number",
    "conflictsEmpty": "No conflicts.",
    "key": "Number",
    "account": "Account",
    "other": "Kept by"
  },
  "mail": {
    "expiredSubject": "{count} accounts lost their protection",
    "expiredText": "These accounts no longer have an owner:",
    "blocked-protected": { "subject": "Blocked: {account} is protected", "text": "{user} tried to create {account}, which is protected by another owner." },
    "blocked-free": { "subject": "Assign {account}", "text": "{user} tried to create {account}. It is already in the CRM without an owner. Assign it in the account if appropriate." }
  }
}
```
`plugins/account-protection/messages/cz.json`:
```json
{
  "name": "Ochrana účtů",
  "rules": {
    "protected": "Tato firma je chráněná do {until}.",
    "alreadyInCrm": "Tato firma už v CRM je. Požádali jsme manažera, aby vám ji přidělil.",
    "exists": "Tato firma už v CRM je.",
    "ownAccount": "Tuto firmu už v CRM máte.",
    "numberRequired": "Zadejte IČO firmy.",
    "ownerManagersOnly": "Vlastníka účtu může změnit jen manažer."
  },
  "tab": {
    "title": "Ochrana",
    "status": "Stav",
    "protected": "Chráněno do {date}",
    "contactNeeded": "Kontakt nutný do {date}",
    "free": "Nechráněno: bez vlastníka",
    "noNumber": "Nechráněno: chybí IČO",
    "contact": "Doložený kontakt",
    "contactYes": "Ano, {date}",
    "contactNo": "Zatím ne",
    "history": "Historie vlastníků",
    "historyEmpty": "Zatím žádné změny vlastníka.",
    "nobody": "nikdo",
    "system": "systém",
    "reason": { "created": "založení", "assigned": "přidělení", "released": "uvolnění", "expired": "vypršení ochrany", "expired-no-contact": "bez kontaktu ve lhůtě", "install": "instalace pluginu" }
  },
  "expiring": {
    "title": "Vypršení ochrany",
    "nav": "Vypršení ochrany",
    "due": "Vyprší do {days} dnů",
    "freed": "Uvolněno za posledních 7 dnů",
    "empty": "Nic tu není."
  },
  "admin": {
    "conflicts": "Účty se stejným IČO",
    "conflictsEmpty": "Žádné konflikty.",
    "key": "Číslo",
    "account": "Účet",
    "other": "Ponechán"
  },
  "mail": {
    "expiredSubject": "Ochrana vypršela u {count} účtů",
    "expiredText": "Tyto účty už nemají vlastníka:",
    "blocked-protected": { "subject": "Zablokováno: {account} je chráněný", "text": "Uživatel {user} se pokusil založit {account}, který chrání jiný vlastník." },
    "blocked-free": { "subject": "Přidělte {account}", "text": "Uživatel {user} se pokusil založit {account}. Firma už je v CRM bez vlastníka. Pokud je to v pořádku, přidělte ji v účtu." }
  }
}
```
`plugins/account-protection/messages/de.json`:
```json
{
  "name": "Kundenschutz",
  "rules": {
    "protected": "Dieses Unternehmen ist bis {until} geschützt.",
    "alreadyInCrm": "Dieses Unternehmen ist bereits im CRM. Ein Manager wurde gebeten, es Ihnen zuzuweisen.",
    "exists": "Dieses Unternehmen ist bereits im CRM.",
    "ownAccount": "Sie haben dieses Unternehmen bereits im CRM.",
    "numberRequired": "Geben Sie die Registernummer des Unternehmens ein.",
    "ownerManagersOnly": "Nur ein Manager kann den Verantwortlichen des Kontos ändern."
  },
  "tab": {
    "title": "Schutz",
    "status": "Status",
    "protected": "Geschützt bis {date}",
    "contactNeeded": "Kontakt nötig bis {date}",
    "free": "Nicht geschützt: kein Verantwortlicher",
    "noNumber": "Nicht geschützt: keine Registernummer",
    "contact": "Nachgewiesener Kontakt",
    "contactYes": "Ja, am {date}",
    "contactNo": "Noch nicht",
    "history": "Verlauf der Verantwortlichen",
    "historyEmpty": "Noch keine Änderungen.",
    "nobody": "niemand",
    "system": "System",
    "reason": { "created": "angelegt", "assigned": "zugewiesen", "released": "freigegeben", "expired": "Schutz abgelaufen", "expired-no-contact": "kein Kontakt in der Frist", "install": "Plugin installiert" }
  },
  "expiring": {
    "title": "Ablaufender Schutz",
    "nav": "Ablaufender Schutz",
    "due": "Läuft in {days} Tagen ab",
    "freed": "In den letzten 7 Tagen freigegeben",
    "empty": "Keine Einträge."
  },
  "admin": {
    "conflicts": "Konten mit derselben Registernummer",
    "conflictsEmpty": "Keine Konflikte.",
    "key": "Nummer",
    "account": "Konto",
    "other": "Behalten"
  },
  "mail": {
    "expiredSubject": "Schutz für {count} Konten abgelaufen",
    "expiredText": "Diese Konten haben keinen Verantwortlichen mehr:",
    "blocked-protected": { "subject": "Blockiert: {account} ist geschützt", "text": "{user} wollte {account} anlegen, das von einem anderen Verantwortlichen geschützt ist." },
    "blocked-free": { "subject": "{account} zuweisen", "text": "{user} wollte {account} anlegen. Das Unternehmen ist bereits ohne Verantwortlichen im CRM. Weisen Sie es im Konto zu, falls passend." }
  }
}
```
`plugins/account-protection/messages/uk.json`:
```json
{
  "name": "Захист облікових записів",
  "rules": {
    "protected": "Ця компанія захищена до {until}.",
    "alreadyInCrm": "Ця компанія вже є в CRM. Менеджера попросили призначити її вам.",
    "exists": "Ця компанія вже є в CRM.",
    "ownAccount": "Ця компанія вже є у вас у CRM.",
    "numberRequired": "Введіть реєстраційний номер компанії.",
    "ownerManagersOnly": "Змінити власника облікового запису може лише менеджер."
  },
  "tab": {
    "title": "Захист",
    "status": "Статус",
    "protected": "Захищено до {date}",
    "contactNeeded": "Потрібен контакт до {date}",
    "free": "Не захищено: немає власника",
    "noNumber": "Не захищено: немає реєстраційного номера",
    "contact": "Підтверджений контакт",
    "contactYes": "Так, {date}",
    "contactNo": "Ще ні",
    "history": "Історія власників",
    "historyEmpty": "Змін власника ще немає.",
    "nobody": "ніхто",
    "system": "система",
    "reason": { "created": "створено", "assigned": "призначено", "released": "звільнено", "expired": "захист закінчився", "expired-no-contact": "немає контакту вчасно", "install": "плагін встановлено" }
  },
  "expiring": {
    "title": "Захист, що закінчується",
    "nav": "Захист, що закінчується",
    "due": "Закінчується протягом {days} днів",
    "freed": "Звільнено за останні 7 днів",
    "empty": "Нічого немає."
  },
  "admin": {
    "conflicts": "Облікові записи з однаковим реєстраційним номером",
    "conflictsEmpty": "Конфліктів немає.",
    "key": "Номер",
    "account": "Обліковий запис",
    "other": "Залишено"
  },
  "mail": {
    "expiredSubject": "Захист закінчився для {count} облікових записів",
    "expiredText": "Ці облікові записи більше не мають власника:",
    "blocked-protected": { "subject": "Заблоковано: {account} захищено", "text": "{user} намагався створити {account}, який захищений іншим власником." },
    "blocked-free": { "subject": "Призначте {account}", "text": "{user} намагався створити {account}. Компанія вже є в CRM без власника. Призначте її в обліковому записі, якщо доречно." }
  }
}
```
Regenerate the registry: `node scripts/plugins/generate-registry.mjs`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec jest plugins/account-protection __tests__/plugins lib/plugins && pnpm exec tsc --noEmit`
Expected: PASS, with the contract test now covering `account-protection`; tsc reports no errors.

- [ ] **Step 5: Commit**

```bash
git add plugins/account-protection/store.ts plugins/account-protection/rules.ts plugins/account-protection/plugin.ts plugins/account-protection/messages plugins/account-protection/__tests__/rules.test.ts plugins/account-protection/__tests__/plugin.test.ts lib/plugins/plugins.generated.ts
git commit -m "feat(account-protection): duplicate and owner-change rules"
```

---

### Task 7: Plugin — after hooks (index, registrations, history)

**Files:**
- Create: `plugins/account-protection/hooks.ts`
- Modify: `plugins/account-protection/plugin.ts`
- Test: `plugins/account-protection/__tests__/hooks.test.ts`, `plugins/account-protection/__tests__/plugin.test.ts`

**Interfaces:**
- Consumes: `K`, `startRegistration`, `clearRegistration`, `addHistory`, `lastHistory`, `Reason` (store.ts); `ownerOf` (rules.ts); `numberKey`; `newRegistration`, `Registration`.
- Produces:
  ```ts
  export function indexNumber(acc: RecordData, ctx: Ctx, at: Date): Promise<string | null>;   // key held by this account, or null (none / conflict)
  export function recordOwner(acc: RecordData, to: string | null, actor: Actor | undefined, reason: Reason, ctx: Ctx, at: Date): Promise<void>;
  export function onCreated(input: AfterInput, ctx: Ctx, at?: Date): Promise<void>;
  export function onUpdated(input: AfterInput, ctx: Ctx, at?: Date): Promise<void>;
  export function onDeleted(input: AfterInput, ctx: Ctx): Promise<void>;
  ```

- [ ] **Step 1: Write the failing tests**

`plugins/account-protection/__tests__/hooks.test.ts`:
```ts
import type { Actor, AfterInput, RecordData } from "@nextcrm/plugin-sdk";
import { createTestContext } from "@nextcrm/plugin-sdk/testing";
import { onCreated, onDeleted, onUpdated } from "../hooks";
import { settingsSchema, type Ctx } from "../settings";
import { K, type HistoryEntry } from "../store";
import type { Registration } from "../state";

const at = new Date("2026-10-01T14:00:00Z");
const manager: Actor = { type: "user", userId: "m1", role: "manager" };
const ctxWith = (accounts: RecordData[]) =>
  createTestContext({ pluginId: "account-protection", settings: settingsSchema.parse({}), data: { accounts } }) as unknown as Ctx;
const ev = (operation: AfterInput["operation"], recordId: string, extra: Partial<AfterInput> = {}): AfterInput =>
  ({ entity: "account", operation, recordId, actor: manager, ...extra });
const history = async (ctx: Ctx, id: string) => (await ctx.store.list(`hist:${id}:`)).map((e) => e.value as HistoryEntry);

it("indexes the number and starts a registration on create", async () => {
  const ctx = ctxWith([{ id: "acc-1", company_id: "27082440", billing_country: "CZ", assigned_to: "rep1" }]);
  await onCreated(ev("created", "acc-1"), ctx, at);
  expect(await ctx.store.get(K.num("CZ:27082440"))).toEqual({ accountId: "acc-1" });
  expect(await ctx.store.get<Registration>(K.reg("acc-1"))).toMatchObject({ ownerId: "rep1", key: "CZ:27082440" });
  expect(await ctx.store.get(K.due("2026-10-31", "acc-1"))).toEqual({});
  expect(await history(ctx, "acc-1")).toEqual([expect.objectContaining({ from: null, to: "rep1", reason: "created", byUserId: "m1", byType: "user" })]);
});

it("records a conflict instead of stealing a number (race)", async () => {
  const ctx = ctxWith([{ id: "acc-2", company_id: "27082440", assigned_to: "rep2" }]);
  await ctx.store.set(K.num("CZ:27082440"), { accountId: "acc-1" });
  await onCreated(ev("created", "acc-2"), ctx, at);
  expect(await ctx.store.get(K.num("CZ:27082440"))).toEqual({ accountId: "acc-1" });
  expect(await ctx.store.get(K.conflict("acc-2"))).toMatchObject({ key: "CZ:27082440", otherAccountId: "acc-1" });
  expect(await ctx.store.get(K.reg("acc-2"))).toBeNull();
});

it("records owner changes, restarts protection and treats '' as no owner (Review Focus 3)", async () => {
  const acc = { id: "acc-1", company_id: "27082440", assigned_to: "rep1" };
  const ctx = ctxWith([acc]);
  await onCreated(ev("created", "acc-1"), ctx, at);
  acc.assigned_to = "rep2";
  await onUpdated(ev("updated", "acc-1", { changed: ["assigned_to"] }), ctx, new Date("2026-10-10T10:00:00Z"));
  expect(await ctx.store.get<Registration>(K.reg("acc-1"))).toMatchObject({ ownerId: "rep2", registeredAt: "2026-10-10T10:00:00.000Z" });
  expect(await ctx.store.get(K.due("2026-10-31", "acc-1"))).toBeNull();
  acc.assigned_to = "";
  await onUpdated(ev("updated", "acc-1", { changed: ["assigned_to"] }), ctx, new Date("2026-10-11T10:00:00Z"));
  expect(await ctx.store.get(K.reg("acc-1"))).toBeNull();
  expect((await history(ctx, "acc-1")).map((h) => [h.from, h.to, h.reason])).toEqual([
    [null, "rep1", "created"], ["rep1", "rep2", "assigned"], ["rep2", null, "released"],
  ]);
});

it("ignores a repeated event (Review Focus 5)", async () => {
  const acc = { id: "acc-1", company_id: "27082440", assigned_to: "rep1" };
  const ctx = ctxWith([acc]);
  await onCreated(ev("created", "acc-1"), ctx, at);
  await onCreated(ev("created", "acc-1"), ctx, new Date("2026-10-01T14:05:00Z"));
  acc.assigned_to = "rep2";
  const e = ev("updated", "acc-1", { changed: ["assigned_to"] });
  await onUpdated(e, ctx, new Date("2026-10-10T10:00:00Z"));
  await onUpdated(e, ctx, new Date("2026-10-10T10:01:00Z"));
  expect(await history(ctx, "acc-1")).toHaveLength(2);
  expect(await ctx.store.get<Registration>(K.reg("acc-1"))).toMatchObject({ registeredAt: "2026-10-10T10:00:00.000Z" });
});

it("records owner history for accounts without a number, without a registration", async () => {
  const acc = { id: "acc-9", company_id: null, assigned_to: "rep1" };
  const ctx = ctxWith([acc]);
  await onCreated(ev("created", "acc-9"), ctx, at);
  expect(await ctx.store.get(K.reg("acc-9"))).toBeNull();
  expect(await history(ctx, "acc-9")).toHaveLength(1);
});

it("moves the number index and the registration on a number change", async () => {
  const acc = { id: "acc-1", company_id: "27082440", assigned_to: "rep1" };
  const ctx = ctxWith([acc]);
  await onCreated(ev("created", "acc-1"), ctx, at);
  acc.company_id = "12345678";
  await onUpdated(ev("updated", "acc-1", { changed: ["company_id"] }), ctx, new Date("2026-10-05T00:00:00Z"));
  expect(await ctx.store.get(K.num("CZ:27082440"))).toBeNull();
  expect(await ctx.store.get(K.num("CZ:12345678"))).toEqual({ accountId: "acc-1" });
  expect(await ctx.store.get<Registration>(K.reg("acc-1"))).toMatchObject({ key: "CZ:12345678", registeredAt: "2026-10-05T00:00:00.000Z" });
});

it("frees the number and the registration on delete, keeping history", async () => {
  const ctx = ctxWith([{ id: "acc-1", company_id: "27082440", assigned_to: "rep1" }]);
  await onCreated(ev("created", "acc-1"), ctx, at);
  await onDeleted(ev("deleted", "acc-1"), ctx);
  expect(await ctx.store.get(K.num("CZ:27082440"))).toBeNull();
  expect(await ctx.store.get(K.reg("acc-1"))).toBeNull();
  expect(await ctx.store.get(K.due("2026-10-31", "acc-1"))).toBeNull();
  expect(await history(ctx, "acc-1")).toHaveLength(1);
});
```
In `plugins/account-protection/__tests__/plugin.test.ts`, add:
```ts
it("listens to account created, updated and deleted", () => {
  expect(plugin.extensions.afters.map((a) => `${a.entity}.${a.operation}`)).toEqual(["account.created", "account.updated", "account.deleted"]);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec jest plugins/account-protection`
Expected: FAIL with "Cannot find module '../hooks'", and the plugin test reports `[]` afters.

- [ ] **Step 3: Implement**

`plugins/account-protection/hooks.ts`:
```ts
import type { Actor, AfterInput, RecordData } from "@nextcrm/plugin-sdk";
import { numberKey } from "./key";
import { ownerOf } from "./rules";
import { newRegistration, type Registration } from "./state";
import { K, addHistory, clearRegistration, lastHistory, startRegistration, type Reason } from "./store";
import type { Ctx } from "./settings";

/** Points num: at this account and returns its key; null when it has no number or another account holds it. */
export async function indexNumber(acc: RecordData, ctx: Ctx, at: Date): Promise<string | null> {
  const id = acc.id as string;
  const key = numberKey(acc, ctx.settings.defaultCountry);
  const old = await ctx.store.get<{ key: string }>(K.acct(id));
  if (old && old.key !== key) {
    const holder = await ctx.store.get<{ accountId: string }>(K.num(old.key));
    if (holder?.accountId === id) await ctx.store.delete(K.num(old.key));
    await ctx.store.delete(K.acct(id));
  }
  if (!key) return null;
  const holder = await ctx.store.get<{ accountId: string }>(K.num(key));
  if (holder && holder.accountId !== id) {
    await ctx.store.set(K.conflict(id), { key, otherAccountId: holder.accountId, foundAt: at.toISOString() });
    return null;
  }
  await ctx.store.set(K.num(key), { accountId: id });
  await ctx.store.set(K.acct(id), { key });
  return key;
}

/** Records an owner change once (retried events are no-ops) and restarts protection for the new owner. */
export async function recordOwner(acc: RecordData, to: string | null, actor: Actor | undefined, reason: Reason, ctx: Ctx, at: Date): Promise<void> {
  const id = acc.id as string;
  const last = await lastHistory(ctx.store, id);
  if (last ? last.to === to : to === null) return;
  await clearRegistration(ctx.store, id);
  await addHistory(ctx.store, id, {
    at: at.toISOString(),
    from: last?.to ?? null,
    to,
    byUserId: actor && "userId" in actor ? actor.userId : null,
    byType: actor?.type ?? "system",
    reason,
  });
  const key = (await ctx.store.get<{ key: string }>(K.acct(id)))?.key;
  if (to && key) await startRegistration(ctx.store, id, newRegistration(key, to, at, ctx.settings));
}

export async function onCreated(input: AfterInput, ctx: Ctx, at = new Date()): Promise<void> {
  const acc = await ctx.data.accounts.get(input.recordId);
  if (!acc) return;
  await indexNumber(acc, ctx, at);
  const to = ownerOf(acc.assigned_to);
  if (to) await recordOwner(acc, to, input.actor, "created", ctx, at);
}

export async function onUpdated(input: AfterInput, ctx: Ctx, at = new Date()): Promise<void> {
  const acc = await ctx.data.accounts.get(input.recordId);
  if (!acc) return;
  const id = acc.id as string;
  const changed = input.changed ?? [];
  if (changed.includes("company_id") || changed.includes("billing_country")) {
    const key = await indexNumber(acc, ctx, at);
    const reg = await ctx.store.get<Registration>(K.reg(id));
    const owner = ownerOf(acc.assigned_to);
    if (reg && reg.key !== key) await clearRegistration(ctx.store, id);
    if (key && owner && (!reg || reg.key !== key)) await startRegistration(ctx.store, id, newRegistration(key, owner, at, ctx.settings));
  }
  if (changed.includes("assigned_to")) {
    const to = ownerOf(acc.assigned_to);
    await recordOwner(acc, to, input.actor, to ? "assigned" : "released", ctx, at);
  }
}

export async function onDeleted(input: AfterInput, ctx: Ctx): Promise<void> {
  const id = input.recordId;
  const indexed = await ctx.store.get<{ key: string }>(K.acct(id));
  if (indexed) {
    const holder = await ctx.store.get<{ accountId: string }>(K.num(indexed.key));
    if (holder?.accountId === id) await ctx.store.delete(K.num(indexed.key));
    await ctx.store.delete(K.acct(id));
  }
  await clearRegistration(ctx.store, id);
  await ctx.store.delete(K.conflict(id));
}
```
In `plugins/account-protection/plugin.ts`: import the hooks and add to `extensions`, after the rules:
```ts
    x.after("account", "created", (input, ctx) => onCreated(input, ctx));
    x.after("account", "updated", (input, ctx) => onUpdated(input, ctx));
    x.after("account", "deleted", (input, ctx) => onDeleted(input, ctx));
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec jest plugins/account-protection __tests__/plugins && pnpm exec tsc --noEmit`
Expected: PASS, and tsc reports no errors.

- [ ] **Step 5: Commit**

```bash
git add plugins/account-protection/hooks.ts plugins/account-protection/plugin.ts plugins/account-protection/__tests__/hooks.test.ts plugins/account-protection/__tests__/plugin.test.ts
git commit -m "feat(account-protection): number index, registrations and owner history"
```

---

### Task 8: Plugin — expiry job, notice sender, install backfill

**Files:**
- Create: `plugins/account-protection/jobs.ts`
- Modify: `plugins/account-protection/plugin.ts`
- Test: `plugins/account-protection/__tests__/jobs.test.ts`, `plugins/account-protection/__tests__/plugin.test.ts`

**Interfaces:**
- Consumes: `indexNumber`, `recordOwner` (hooks.ts); `K`, `addHistory`, `clearRegistration`, `Notice` (store.ts); `evaluate`, `dueDay`, `isoDay`, `Registration`; `contactTypes`.
- Produces:
  ```ts
  export function expire(ctx: Ctx, now: Date): Promise<void>;        // cron "expire", "0 6 * * *"
  export function sendNotices(ctx: Ctx, now: Date): Promise<void>;   // cron "notices", "*/5 * * * *"
  export function install(ctx: Ctx, at: Date): Promise<void>;        // onInstall
  ```

- [ ] **Step 1: Write the failing tests**

`plugins/account-protection/__tests__/jobs.test.ts`:
```ts
import type { RecordData } from "@nextcrm/plugin-sdk";
import { createTestContext } from "@nextcrm/plugin-sdk/testing";
import { expire, install, sendNotices } from "../jobs";
import { settingsSchema, type Ctx } from "../settings";
import { K, queueNotice, type HistoryEntry } from "../store";
import { newRegistration, type Registration } from "../state";
import { startRegistration } from "../store";

const S = settingsSchema.parse({});
type TestCtx = Ctx & { notifications: { roles?: string[]; subject: string; text: string }[]; logs: { level: string; message: string }[] };
const mk = (accounts: RecordData[], activities: RecordData[] = [], users: RecordData[] = []) =>
  createTestContext({ pluginId: "account-protection", actor: { type: "plugin", pluginId: "account-protection" }, settings: S, data: { accounts, activities, users } }) as unknown as TestCtx;

async function registered(ctx: Ctx, id: string, at: Date) {
  const reg = newRegistration(`CZ:${id}`, "rep1", at, S);
  await startRegistration(ctx.store, id, reg);
  await ctx.store.set(K.hist(id, at.toISOString()), { at: at.toISOString(), from: null, to: "rep1", byUserId: null, byType: "user", reason: "created" } satisfies HistoryEntry);
  return reg;
}
const reg1 = new Date("2026-10-01T14:00:00Z");

it("keeps an account on the deadline morning and expires it the next day without contact (Review Focus 4)", async () => {
  const accounts = [{ id: "acc-1", name: "Alza", assigned_to: "rep1" }];
  const ctx = mk(accounts);
  await registered(ctx, "acc-1", reg1);
  await expire(ctx, new Date("2026-10-31T06:00:00Z"));
  expect(accounts[0].assigned_to).toBe("rep1");
  expect(ctx.notifications).toEqual([]);
  await expire(ctx, new Date("2026-11-01T06:00:00Z"));
  expect(accounts[0].assigned_to).toBeNull();
  expect(await ctx.store.get(K.reg("acc-1"))).toBeNull();
  expect(await ctx.store.get(K.freed("2026-11-01", "acc-1"))).toEqual({ reason: "expired-no-contact" });
  const hist = (await ctx.store.list("hist:acc-1:")).map((e) => e.value as HistoryEntry);
  expect(hist[hist.length - 1]).toMatchObject({ from: "rep1", to: null, reason: "expired-no-contact", byType: "plugin" });
  expect(ctx.notifications).toEqual([expect.objectContaining({ roles: ["manager", "admin"], subject: "mail.expiredSubject" })]);
  expect(ctx.notifications[0].text).toContain("Alza");
});

it("keeps protection when a qualifying contact exists and moves the due day", async () => {
  const accounts = [{ id: "acc-1", name: "Alza", assigned_to: "rep1" }];
  const activities = [
    { id: "a1", type: "note", status: "completed", date: "2026-10-10T09:00:00Z", links: [{ entityType: "account", entityId: "acc-1" }] },
    { id: "a2", type: "visit", status: "completed", date: "2026-10-20T09:00:00Z", links: [{ entityType: "account", entityId: "acc-1" }] },
  ];
  const ctx = mk(accounts, activities);
  await registered(ctx, "acc-1", reg1);
  await expire(ctx, new Date("2026-11-01T06:00:00Z"));
  expect(accounts[0].assigned_to).toBe("rep1");
  expect(await ctx.store.get<Registration>(K.reg("acc-1"))).toMatchObject({ contactAt: "2026-10-20T09:00:00.000Z" });
  expect(await ctx.store.get(K.due("2026-12-30", "acc-1"))).toEqual({});
  expect(await ctx.store.get(K.due("2026-10-31", "acc-1"))).toBeNull();
});

it("expires after the protection window even with contact", async () => {
  const accounts = [{ id: "acc-1", name: "Alza", assigned_to: "rep1" }];
  const ctx = mk(accounts);
  const reg = await registered(ctx, "acc-1", reg1);
  await ctx.store.delete(K.due("2026-10-31", "acc-1"));
  await startRegistration(ctx.store, "acc-1", { ...reg, contactAt: "2026-10-05T00:00:00.000Z" });
  await expire(ctx, new Date("2026-12-31T06:00:00Z"));
  expect(accounts[0].assigned_to).toBeNull();
  expect(await ctx.store.get(K.freed("2026-12-31", "acc-1"))).toEqual({ reason: "expired" });
});

it("sends no email on an empty run and prunes old freed entries", async () => {
  const ctx = mk([]);
  await ctx.store.set(K.freed("2026-10-01", "old"), { reason: "expired" });
  await ctx.store.set(K.freed("2026-10-28", "recent"), { reason: "expired" });
  await expire(ctx, new Date("2026-11-01T06:00:00Z"));
  expect(ctx.notifications).toEqual([]);
  expect(await ctx.store.get(K.freed("2026-10-01", "old"))).toBeNull();
  expect(await ctx.store.get(K.freed("2026-10-28", "recent"))).toEqual({ reason: "expired" });
});

it("continues past an account that fails", async () => {
  const accounts = [{ id: "acc-2", name: "B", assigned_to: "rep1" }];
  const ctx = mk(accounts);
  await registered(ctx, "acc-1", reg1);   // acc-1 is not in the data → update throws
  await registered(ctx, "acc-2", reg1);
  await expire(ctx, new Date("2026-11-01T06:00:00Z"));
  expect(accounts[0].assigned_to).toBeNull();
  expect(ctx.logs.some((l) => l.level === "error" && l.message.includes("acc-1"))).toBe(true);
});

it("sends queued notices to managers and deletes them", async () => {
  const ctx = mk([{ id: "acc-1", name: "Alza" }], [], [{ id: "rep2", name: "Rep Two" }]);
  await queueNotice(ctx.store, { kind: "blocked-protected", userId: "rep2", accountId: "acc-1" }, new Date("2026-11-01T06:00:00Z"));
  await sendNotices(ctx, new Date("2026-11-01T06:05:00Z"));
  expect(ctx.notifications).toEqual([{ roles: ["manager", "admin"], subject: "mail.blocked-protected.subject", text: "mail.blocked-protected.text" }]);
  expect(await ctx.store.list("notice:")).toEqual([]);
});

it("keeps a failing notice for retry and drops it after 24 hours", async () => {
  const ctx = mk([{ id: "acc-1", name: "Alza" }]);
  ctx.notify = async () => { throw new Error("smtp down"); };
  await queueNotice(ctx.store, { kind: "blocked-free", userId: null, accountId: "acc-1" }, new Date("2026-11-01T06:00:00Z"));
  await sendNotices(ctx, new Date("2026-11-01T07:00:00Z"));
  expect(await ctx.store.list("notice:")).toHaveLength(1);
  await sendNotices(ctx, new Date("2026-11-02T06:01:00Z"));
  expect(await ctx.store.list("notice:")).toEqual([]);
  expect(ctx.logs.some((l) => l.level === "error")).toBe(true);
});

it("backfills on install: oldest account wins a shared number, owners get registrations and history", async () => {
  const accounts = [
    { id: "acc-1", company_id: "27082440", assigned_to: "rep1", deletedAt: null },
    { id: "acc-2", company_id: "270 824 40", assigned_to: "rep2", deletedAt: null },
    { id: "acc-3", company_id: null, assigned_to: "rep3", deletedAt: null },
    { id: "acc-4", company_id: "11111111", assigned_to: null, deletedAt: null },
  ];
  const ctx = mk(accounts);
  const at = new Date("2026-11-13T08:00:00Z");
  await install(ctx, at);
  expect(await ctx.store.get(K.num("CZ:27082440"))).toEqual({ accountId: "acc-1" });
  expect(await ctx.store.get(K.conflict("acc-2"))).toMatchObject({ otherAccountId: "acc-1" });
  expect(await ctx.store.get<Registration>(K.reg("acc-1"))).toMatchObject({ ownerId: "rep1", registeredAt: at.toISOString() });
  expect(await ctx.store.get(K.reg("acc-2"))).toBeNull();
  expect(await ctx.store.get(K.reg("acc-3"))).toBeNull();
  expect(await ctx.store.get(K.num("CZ:11111111"))).toEqual({ accountId: "acc-4" });
  expect((await ctx.store.list("hist:")).map((e) => (e.value as HistoryEntry).reason)).toEqual(["install", "install", "install"]);
});
```
In `plugins/account-protection/__tests__/plugin.test.ts`, add:
```ts
it("schedules the expiry and notice jobs and backfills on install", () => {
  expect(plugin.extensions.crons.map((c) => [c.id, c.schedule])).toEqual([["expire", "0 6 * * *"], ["notices", "*/5 * * * *"]]);
  expect(typeof plugin.onInstall).toBe("function");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec jest plugins/account-protection`
Expected: FAIL with "Cannot find module '../jobs'".

- [ ] **Step 3: Implement**

`plugins/account-protection/jobs.ts`:
```ts
import { indexNumber, recordOwner } from "./hooks";
import { ownerOf } from "./rules";
import { contactTypes, type Ctx } from "./settings";
import { dueDay, evaluate, isoDay, type Registration } from "./state";
import { K, addHistory, clearRegistration, type Notice } from "./store";

const MANAGERS = ["manager", "admin"] as const;   // Ruling 7
const DAY = 86_400_000;

export async function expire(ctx: Ctx, now: Date): Promise<void> {
  const today = isoDay(now);
  const freed: string[] = [];
  for (const entry of await ctx.store.list("due:")) {
    const day = entry.key.slice(4, 14);
    const accountId = entry.key.slice(15);
    if (day > today) continue;
    try {
      const reg = await ctx.store.get<Registration>(K.reg(accountId));
      if (!reg) { await ctx.store.delete(entry.key); continue; }
      let verdict: string = evaluate(reg, now);
      if (verdict === "check-contact") {
        const [contact] = await ctx.data.activities.findForRecord("account", accountId, {
          types: contactTypes(ctx.settings.contactTypes), status: "completed", since: new Date(reg.registeredAt), take: 1,
        });
        if (contact) {
          const updated: Registration = { ...reg, contactAt: new Date(contact.date as string).toISOString() };
          await ctx.store.delete(entry.key);
          await ctx.store.set(K.reg(accountId), updated);
          await ctx.store.set(K.due(dueDay(updated), accountId), {});
          continue;
        }
        verdict = "expired-no-contact";
      }
      if (verdict === "keep") continue;
      const reason = verdict as "expired" | "expired-no-contact";
      const row = await ctx.data.accounts.update(accountId, { assigned_to: null });
      await addHistory(ctx.store, accountId, { at: now.toISOString(), from: reg.ownerId, to: null, byUserId: null, byType: "plugin", reason });
      await ctx.store.set(K.freed(today, accountId), { reason });
      await clearRegistration(ctx.store, accountId);
      freed.push(String(row.name ?? accountId));
    } catch (e) {
      ctx.log.error(`Expiry failed for account ${accountId}: ${String(e)}`);
    }
  }
  const cutoff = isoDay(new Date(now.getTime() - 7 * DAY));
  for (const entry of await ctx.store.list("freed:")) {
    if (entry.key.slice(6, 16) < cutoff) await ctx.store.delete(entry.key);
  }
  if (freed.length) {
    await ctx.notify({
      roles: [...MANAGERS],
      subject: ctx.t("mail.expiredSubject", { count: freed.length }),
      text: [ctx.t("mail.expiredText"), ...freed.map((n) => `- ${n}`)].join("\n"),
    });
  }
}

export async function sendNotices(ctx: Ctx, now: Date): Promise<void> {
  for (const entry of await ctx.store.list("notice:")) {
    const n = entry.value as Notice;
    try {
      const account = await ctx.data.accounts.get(n.accountId);
      const user = n.userId ? await ctx.data.users.get(n.userId) : null;
      const params = { account: String(account?.name ?? n.accountId), user: String(user?.name ?? user?.email ?? "-") };
      await ctx.notify({ roles: [...MANAGERS], subject: ctx.t(`mail.${n.kind}.subject`, params), text: ctx.t(`mail.${n.kind}.text`, params) });
      await ctx.store.delete(entry.key);
    } catch (e) {
      if (now.getTime() - Date.parse(n.at) > DAY) {
        ctx.log.error(`Notice dropped after 24 h: ${String(e)}`, { accountId: n.accountId });
        await ctx.store.delete(entry.key);
      } else {
        ctx.log.warn(`Notice not sent, will retry: ${String(e)}`, { accountId: n.accountId });
      }
    }
  }
}

export async function install(ctx: Ctx, at: Date): Promise<void> {
  const actor = { type: "plugin" as const, pluginId: ctx.plugin.id };
  for (let skip = 0; ; skip += 100) {
    const page = await ctx.data.accounts.find({ where: { deletedAt: null }, orderBy: { createdAt: "asc" }, take: 100, skip });
    for (const acc of page) {
      await indexNumber(acc, ctx, at);
      const owner = ownerOf(acc.assigned_to);
      if (owner) await recordOwner(acc, owner, actor, "install", ctx, at);
    }
    if (page.length < 100) break;
  }
}
```
In `plugins/account-protection/plugin.ts`: import `expire`, `sendNotices` and `install`, and add to `extensions`:
```ts
    x.cron("expire", "0 6 * * *", (ctx) => expire(ctx, new Date()));
    x.cron("notices", "*/5 * * * *", (ctx) => sendNotices(ctx, new Date()));
```
and to the manifest:
```ts
  onInstall: (ctx) => install(ctx, new Date()),
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec jest plugins/account-protection __tests__/plugins && pnpm exec tsc --noEmit`
Expected: PASS (the contract test validates both crons), and tsc reports no errors.

- [ ] **Step 5: Commit**

```bash
git add plugins/account-protection/jobs.ts plugins/account-protection/plugin.ts plugins/account-protection/__tests__/jobs.test.ts plugins/account-protection/__tests__/plugin.test.ts
git commit -m "feat(account-protection): daily expiry, manager notices, install backfill"
```

---

### Task 9: Plugin — tab, panel, Expiring page, admin section

**Files:**
- Create: `plugins/account-protection/ui/common.ts`, `ui/ProtectionTab.tsx`, `ui/ProtectionPanel.tsx`, `ui/ExpiringPage.tsx`, `ui/ConflictsSection.tsx`
- Modify: `plugins/account-protection/plugin.ts`
- Test: `plugins/account-protection/__tests__/ui.test.ts`, `plugins/account-protection/__tests__/plugin.test.ts`

**Interfaces:**
- Consumes: `numberKey`, `summarize`, `formatDay`, `isoDay`, `Registration`, `K`, `HistoryEntry`, `contactTypes`.
- Produces:
  ```ts
  // ui/common.ts
  export function liveContact(ctx: Ctx, accountId: string, reg: Registration): Promise<string | null>;
  export function loadSummary(ctx: Ctx, accountId: string): Promise<{ summary: Summary; reg: Registration | null; contactAt: string | null }>;
  export function summaryText(ctx: Ctx, s: Summary): string;
  export function dueWithin(ctx: Ctx, now: Date): Promise<{ accountId: string; day: string }[]>;
  ```
- Slots: tab `protection` (title key `tab.title`, all roles); panel `protection` (all roles); page `expiring` (title `expiring.title`, roles manager and admin, `nav: { label: "expiring.nav" }`); one admin section.

- [ ] **Step 1: Write the failing tests**

`plugins/account-protection/__tests__/ui.test.ts`:
```ts
import { createTestContext } from "@nextcrm/plugin-sdk/testing";
import { dueWithin, loadSummary, summaryText } from "../ui/common";
import { settingsSchema, type Ctx } from "../settings";
import { K, startRegistration } from "../store";
import { newRegistration } from "../state";

const S = settingsSchema.parse({});
const mk = (accounts: Record<string, unknown>[], activities: Record<string, unknown>[] = []) =>
  createTestContext({ pluginId: "account-protection", settings: S, data: { accounts, activities } }) as unknown as Ctx;

it("summarizes live: contact found by the panel without waiting for the job", async () => {
  const ctx = mk([{ id: "acc-1", company_id: "27082440" }],
    [{ id: "a1", type: "visit", status: "completed", date: "2026-10-05T09:00:00Z", links: [{ entityType: "account", entityId: "acc-1" }] }]);
  await startRegistration(ctx.store, "acc-1", newRegistration("CZ:27082440", "rep1", new Date("2026-10-01T14:00:00Z"), S));
  const { summary, contactAt } = await loadSummary(ctx, "acc-1");
  expect(contactAt).toBe("2026-10-05T09:00:00.000Z");
  expect(summary).toEqual({ kind: "protected", date: "2026-12-30T14:00:00.000Z" });
  expect(summaryText(ctx, summary)).toBe("tab.protected");
});

it("reports accounts without a number and free accounts", async () => {
  const ctx = mk([{ id: "acc-1", company_id: "" }, { id: "acc-2", company_id: "12345678" }]);
  expect((await loadSummary(ctx, "acc-1")).summary).toEqual({ kind: "noNumber" });
  expect((await loadSummary(ctx, "acc-2")).summary).toEqual({ kind: "free" });
});

it("lists registrations due within the warning window", async () => {
  const ctx = mk([]);
  await ctx.store.set(K.due("2026-11-03", "acc-1"), {});
  await ctx.store.set(K.due("2026-11-20", "acc-2"), {});
  await expect(dueWithin(ctx, new Date("2026-11-01T06:00:00Z"))).resolves.toEqual([{ accountId: "acc-1", day: "2026-11-03" }]);
});
```
In `plugins/account-protection/__tests__/plugin.test.ts`, add:
```ts
it("registers the tab, the panel, the Expiring page in the menu and an admin section", () => {
  const e = plugin.extensions;
  expect(e.accountTabs.map((t) => [t.id, t.title, t.roles])).toEqual([["protection", "tab.title", ["user", "manager", "admin"]]]);
  expect(e.accountPanels.map((p) => p.id)).toEqual(["protection"]);
  expect(e.pages.map((p) => [p.path, p.title, p.roles, p.nav])).toEqual([["expiring", "expiring.title", ["manager", "admin"], { label: "expiring.nav" }]]);
  expect(e.adminSections).toHaveLength(1);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec jest plugins/account-protection`
Expected: FAIL with "Cannot find module '../ui/common'", and the plugin test reports no tabs.

- [ ] **Step 3: Implement**

`plugins/account-protection/ui/common.ts`:
```ts
import { numberKey } from "../key";
import { contactTypes, type Ctx } from "../settings";
import { formatDay, isoDay, summarize, type Registration, type Summary } from "../state";
import { K } from "../store";

const DAY = 86_400_000;

export async function liveContact(ctx: Ctx, accountId: string, reg: Registration): Promise<string | null> {
  if (reg.contactAt) return reg.contactAt;
  const [a] = await ctx.data.activities.findForRecord("account", accountId, {
    types: contactTypes(ctx.settings.contactTypes), status: "completed", since: new Date(reg.registeredAt), take: 1,
  });
  return a ? new Date(a.date as string).toISOString() : null;
}

export async function loadSummary(ctx: Ctx, accountId: string) {
  const acc = await ctx.data.accounts.get(accountId);
  const hasKey = !!acc && !!numberKey(acc, ctx.settings.defaultCountry);
  const reg = await ctx.store.get<Registration>(K.reg(accountId));
  const contactAt = reg ? await liveContact(ctx, accountId, reg) : null;
  return { summary: summarize(hasKey, reg, contactAt), reg, contactAt };
}

export function summaryText(ctx: Ctx, s: Summary): string {
  return "date" in s ? ctx.t(`tab.${s.kind}`, { date: formatDay(s.date, ctx.locale) }) : ctx.t(`tab.${s.kind}`);
}

export async function dueWithin(ctx: Ctx, now: Date): Promise<{ accountId: string; day: string }[]> {
  const horizon = isoDay(new Date(now.getTime() + ctx.settings.warnDays * DAY));
  return (await ctx.store.list("due:"))
    .map((e) => ({ day: e.key.slice(4, 14), accountId: e.key.slice(15) }))
    .filter((e) => e.day <= horizon)
    .map(({ accountId, day }) => ({ accountId, day }));
}
```
`plugins/account-protection/ui/ProtectionPanel.tsx`:
```tsx
import type { AccountSlotProps } from "@nextcrm/plugin-sdk";
import type { Settings } from "../settings";
import { loadSummary, summaryText } from "./common";

export async function ProtectionPanel({ accountId, ctx }: AccountSlotProps<Settings>) {
  const { summary } = await loadSummary(ctx, accountId);
  return <p className="text-sm font-medium">{summaryText(ctx, summary)}</p>;
}
```
`plugins/account-protection/ui/ProtectionTab.tsx`:
```tsx
import type { AccountSlotProps } from "@nextcrm/plugin-sdk";
import type { Settings } from "../settings";
import { formatDay } from "../state";
import type { HistoryEntry } from "../store";
import { loadSummary, summaryText } from "./common";

export async function ProtectionTab({ accountId, ctx }: AccountSlotProps<Settings>) {
  const { summary, reg, contactAt } = await loadSummary(ctx, accountId);
  const history = (await ctx.store.list(`hist:${accountId}:`)).map((e) => e.value as HistoryEntry).reverse();
  const ids = Array.from(new Set(history.flatMap((h) => [h.from, h.to, h.byUserId]).filter((x): x is string => !!x)));
  const names = new Map<string, string>();
  for (const id of ids) {
    const u = await ctx.data.users.get(id);
    names.set(id, String(u?.name ?? u?.email ?? id));
  }
  const who = (id: string | null) => (id ? names.get(id) ?? id : ctx.t("tab.nobody"));
  return (
    <div className="space-y-4 text-sm">
      <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1">
        <dt className="text-muted-foreground">{ctx.t("tab.status")}</dt>
        <dd>{summaryText(ctx, summary)}</dd>
        {reg && (
          <>
            <dt className="text-muted-foreground">{ctx.t("tab.contact")}</dt>
            <dd>{contactAt ? ctx.t("tab.contactYes", { date: formatDay(contactAt, ctx.locale) }) : ctx.t("tab.contactNo")}</dd>
          </>
        )}
      </dl>
      <div>
        <h3 className="mb-2 font-medium">{ctx.t("tab.history")}</h3>
        {history.length === 0 ? (
          <p className="text-muted-foreground">{ctx.t("tab.historyEmpty")}</p>
        ) : (
          <table className="w-full">
            <tbody>
              {history.map((h) => (
                <tr key={h.at} className="border-t">
                  <td className="py-1 pr-4 whitespace-nowrap">{formatDay(h.at, ctx.locale)}</td>
                  <td className="py-1 pr-4">{who(h.from)} → {who(h.to)}</td>
                  <td className="py-1 pr-4">{h.byUserId ? who(h.byUserId) : ctx.t("tab.system")}</td>
                  <td className="py-1 text-muted-foreground">{ctx.t(`tab.reason.${h.reason}`)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
```
`plugins/account-protection/ui/ExpiringPage.tsx`:
```tsx
import type { PageProps } from "@nextcrm/plugin-sdk";
import type { Settings } from "../settings";
import { formatDay } from "../state";
import { dueWithin } from "./common";

async function rows(ctx: PageProps<Settings>["ctx"], items: { accountId: string; day: string }[]) {
  const out: { id: string; name: string; day: string }[] = [];
  for (const { accountId, day } of items) {
    const acc = await ctx.data.accounts.get(accountId);
    if (acc) out.push({ id: accountId, name: String(acc.name ?? accountId), day });
  }
  return out;
}

export async function ExpiringPage({ ctx }: PageProps<Settings>) {
  const due = await rows(ctx, await dueWithin(ctx, new Date()));
  const freed = await rows(ctx, (await ctx.store.list("freed:")).map((e) => ({ day: e.key.slice(6, 16), accountId: e.key.slice(17) })));
  const list = (items: { id: string; name: string; day: string }[]) =>
    items.length === 0 ? <p className="text-muted-foreground">{ctx.t("expiring.empty")}</p> : (
      <ul className="space-y-1">
        {items.map((r) => (
          <li key={`${r.id}-${r.day}`}><span className="mr-3 tabular-nums">{formatDay(r.day, ctx.locale)}</span><a className="underline" href={`/crm/accounts/${r.id}`}>{r.name}</a></li>
        ))}
      </ul>
    );
  return (
    <div className="space-y-6 text-sm">
      <h1 className="text-xl font-semibold">{ctx.t("expiring.title")}</h1>
      <section><h2 className="mb-2 font-medium">{ctx.t("expiring.due", { days: ctx.settings.warnDays })}</h2>{list(due)}</section>
      <section><h2 className="mb-2 font-medium">{ctx.t("expiring.freed")}</h2>{list(freed)}</section>
    </div>
  );
}
```
`plugins/account-protection/ui/ConflictsSection.tsx`:
```tsx
import type { AdminSectionProps } from "@nextcrm/plugin-sdk";
import type { Settings } from "../settings";

export async function ConflictsSection({ ctx }: AdminSectionProps<Settings>) {
  const conflicts = (await ctx.store.list("conflict:")).map((e) => ({ id: e.key.slice(9), ...(e.value as { key: string; otherAccountId: string }) }));
  const name = async (id: string) => String((await ctx.data.accounts.get(id))?.name ?? id);
  const rows = [];
  for (const c of conflicts) rows.push({ ...c, name: await name(c.id), otherName: await name(c.otherAccountId) });
  return (
    <section className="space-y-2 text-sm">
      <h2 className="font-medium">{ctx.t("admin.conflicts")}</h2>
      {rows.length === 0 ? <p className="text-muted-foreground">{ctx.t("admin.conflictsEmpty")}</p> : (
        <table className="w-full">
          <thead><tr className="text-left text-muted-foreground"><th>{ctx.t("admin.key")}</th><th>{ctx.t("admin.account")}</th><th>{ctx.t("admin.other")}</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="py-1 pr-4">{r.key}</td>
                <td className="py-1 pr-4"><a className="underline" href={`/crm/accounts/${r.id}`}>{r.name}</a></td>
                <td className="py-1"><a className="underline" href={`/crm/accounts/${r.otherAccountId}`}>{r.otherName}</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
```
In `plugins/account-protection/plugin.ts`: import the four components and add to `extensions`:
```ts
    x.accountTab({ id: "protection", title: "tab.title", component: ProtectionTab });
    x.accountPanel({ id: "protection", component: ProtectionPanel });
    x.page({ path: "expiring", title: "expiring.title", component: ExpiringPage, roles: ["manager", "admin"], nav: { label: "expiring.nav" } });
    x.adminSection(ConflictsSection);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec jest plugins/account-protection __tests__/plugins && pnpm exec tsc --noEmit && pnpm exec eslint plugins/account-protection`
Expected: PASS, and tsc and eslint report no errors.

- [ ] **Step 5: Commit**

```bash
git add plugins/account-protection/ui plugins/account-protection/plugin.ts plugins/account-protection/__tests__/ui.test.ts plugins/account-protection/__tests__/plugin.test.ts
git commit -m "feat(account-protection): protection tab, panel, Expiring page, conflicts section"
```

---

### Task 10: Whole-branch verification and manual check

**Files:** none changed unless a check fails. A fix gets its own failing test and commit.

- [ ] **Step 1: Full suite, types, lint**

Run: `pnpm exec jest 2>&1 | tail -8 && pnpm exec tsc --noEmit && pnpm exec eslint plugins/account-protection lib/plugins packages/plugin-sdk "app/[locale]/(routes)/components/app-sidebar.tsx" "app/[locale]/(routes)/layout.tsx" components/crm/activities/ActivityForm.tsx lib/mcp/tools/crm-activities.ts`
Expected: only the baseline suites from Global Constraints fail; tsc and eslint report no errors.

- [ ] **Step 2: Production build**

Load the CI dummy env from `.github/workflows/ci.yml` (lines 22–49) into the shell, then run:
`pnpm exec prisma generate && pnpm exec next build`
Expected: the build succeeds. Do not run `prisma migrate deploy` here.

- [ ] **Step 3: Manual check on local dev (with Pavel, or driven in Chrome)**

Setup:
- `prisma migrate deploy` against the local dev DB (localhost:5433), which applies the `visit` migration;
- a throwaway Inngest dev container pointed at the dev server port;
- `next dev` with `../nextcrm-app/.env` and `.env.local` exported, and the app URLs set to that port.

Then check:
1. Install and enable account-protection. Accounts with an owner and an IČO show "Protected until …" in the panel, and the history shows "plugin installed".
2. As a `user`-role rep, create an account with an IČO another rep holds → "This company is protected until …". Within 5 minutes, managers get the email.
3. As the same rep, change the owner on your own account → "Only a manager can change the account owner." Save the form without changing the owner → it saves.
4. As a manager, reassign the account → the history shows the change, and the panel shows a new 90-day window.
5. Log a completed **Visit** on a registered account → the panel shows "Protected until …" instead of "Contact needed by …".
6. "Expiring protection" appears in the sidebar for managers only and lists due registrations.
7. Disable the plugin → the tab, panel, menu item and rules are gone.

Run `git checkout -- AGENTS.md` afterwards.

- [ ] **Step 4: Record results in the ledger and hand off to finishing-a-development-branch**
