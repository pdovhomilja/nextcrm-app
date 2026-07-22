# CRM Server-Action Authorization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add object-level authorization to every unguarded mutating CRM server action so a `role: "user"` can only write records they own/are assigned (admin/manager: all), closing the IDOR half of GHSA-qwhm-9fcm-p878.

**Architecture:** Add seven `assertCanWrite*` helpers to `lib/authz/scopes/crm.ts` mirroring the existing `assertCanWriteAccount`, then guard each action by resolving an `AuthzUser` via `requireAuthenticated()` and calling the matching assert before the mutation. The authorization model already ships on the read side; this mirrors it onto writes.

**Tech Stack:** Next.js server actions, Prisma 7, `lib/authz` (existing), jest 30.

Spec: `docs/superpowers/specs/2026-07-20-crm-server-action-authz-design.md`

## Global Constraints

- **Model, not invented:** a `user` owns a record via that model's ownership columns; admin/manager are unrestricted. Writes mirror the already-shipped read scope. No schema change, no migration.
- **Every regression test must FAIL against the pre-fix code.** A test that passes with the guard removed proves nothing — that is the acceptance bar.
- Run jest via `./node_modules/.bin/jest <path>` (NEVER `pnpm test` — `ERR_PNPM_IGNORED_BUILDS`). Finish each task with `pnpm exec tsc --noEmit` clean.
- Existing suites must stay green; the whole suite baseline is 204 suites / 1096 tests (this branch, `security/workstream-a-crm-authz`, forked from `dev`).
- Conventional commits, one per task. Work on `security/workstream-a-crm-authz`.
- CRM tasks (`crm_Accounts_Tasks`) and Projects tasks (`boards`/`tasks`) are separate modules; do NOT reuse the Projects `assertCanWriteTask` for CRM tasks.
- Exact ownership columns per model (a copy-paste guard keyed on the wrong column silently authorizes against a nonexistent field):
  - `crm_Leads`, `crm_Opportunities`, `crm_Contracts`: `assigned_to`, `createdBy` (camelCase), soft-delete `deletedAt`.
  - `crm_TargetLists`: `created_by` (snake_case, **no `assigned_to`**), soft-delete `deletedAt`.
  - `crm_Accounts_Tasks`: `createdBy` **or** `user` (assignee); **no `deletedAt`** (hard delete).
  - `crm_OpportunityLineItems`: parent `opportunityId` (relation `opportunity`); no assignee/soft-delete.
  - `crm_ContractLineItems`: parent `contractId` (relation `contract`); no assignee/soft-delete.

### Guard Recipe (apply verbatim; substitute the named parts per action)

Every guarded action replaces its `getSession()` existence check with an `AuthzUser` resolution, then asserts. Authorization runs **outside** the mutation try/catch so a denial is never swallowed. This exact shape (from `actions/crm/activities/update-activity.ts`) is the canonical pattern:

```ts
import {
  requireAuthenticated,
  AuthenticationError,
  AuthorizationError,
  /* the specific assertCanWrite* for this entity */
} from "@/lib/authz";

// ...inside the action, at the very top, replacing the old getSession() block:
let user;
try {
  user = await requireAuthenticated();
} catch (e) {
  if (e instanceof AuthenticationError) return { error: "Unauthorized" };
  throw e;
}
try {
  await assertCanWriteX(user, ID);        // ID = the record id or parent id per action
} catch (e) {
  if (e instanceof AuthorizationError) return { error: "Forbidden" };
  throw e;
}
// ...existing mutation try/catch unchanged; use user.id wherever session.user.id was used.
```

Notes for applying the recipe:
- Where an action previously stamped `createdBy`/`updatedBy`/`deletedBy` from `session.user.id`, use `user.id`.
- Some actions currently return the string `"Unauthorized"` or `{ error: "Unauthorized" }` on no session; the recipe standardizes on `{ error: "Unauthorized" }` / `{ error: "Forbidden" }` object returns.
- Contract actions currently resolve the user via `session.user.email` → `prismadb.users.findUnique`. Replace that lookup with `requireAuthenticated()`; `user.id` is the same value they stamped as `createdBy`.
- Actions wrapped by `createSafeAction` keep their wrapper; the guard goes at the top of the handler body.

### Action-test Recipe (apply verbatim; substitute the named parts per action test)

Each guarded action gets a colocated `__tests__/<action>-scope.test.ts` mocking `@/lib/authz` and `@/lib/prisma`. The three load-bearing assertions: owner/assignee succeeds; non-owner `user` returns `{ error: "Forbidden" }` **and the mutation is not called**; admin/manager succeeds.

```ts
jest.mock("@/lib/authz", () => ({
  requireAuthenticated: jest.fn(),
  AuthenticationError: class AuthenticationError extends Error {},
  AuthorizationError: class AuthorizationError extends Error {},
  assertCanWriteX: jest.fn(),        // the entity's helper
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: { crm_Model: { update: jest.fn(), findUnique: jest.fn(), /* etc */ } },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

import { requireAuthenticated, assertCanWriteX, AuthorizationError } from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import { theAction } from "@/actions/crm/.../the-action";

const authed = requireAuthenticated as jest.Mock;
const assertX = assertCanWriteX as jest.Mock;

beforeEach(() => jest.clearAllMocks());

it("denies a non-owner and does not mutate", async () => {
  authed.mockResolvedValue({ id: "attacker", role: "user" });
  assertX.mockRejectedValue(new AuthorizationError());
  const res = await theAction(/* args with a victim id */);
  expect(res).toEqual({ error: "Forbidden" });
  expect(prismadb.crm_Model.update).not.toHaveBeenCalled();
});

it("allows an authorized caller", async () => {
  authed.mockResolvedValue({ id: "owner", role: "user" });
  assertX.mockResolvedValue(undefined);
  prismadb.crm_Model.update.mockResolvedValue({ id: "x" });
  const res = await theAction(/* args */);
  expect(assertX).toHaveBeenCalledWith({ id: "owner", role: "user" }, /* the id */);
  expect(prismadb.crm_Model.update).toHaveBeenCalled();
});
```

Because `assertCanWriteX` is mocked, the action test verifies **wiring** (that the guard is called with the right id and that a rejection blocks the mutation). The **scope logic** itself is verified by the helper unit tests in Task 1. This split is deliberate and matches the repo's existing separation.

---

### Task 1: Foundation — the seven write-scope helpers

**Files:**
- Modify: `lib/authz/scopes/crm.ts` (add helpers after the existing read-scope helpers, ~line 392)
- Modify: `lib/authz/index.ts` (re-export the new helpers, ~line 51)
- Test: `lib/authz/__tests__/scopes-crm-write.test.ts` (new)

**Interfaces:**
- Produces (all exported from `lib/authz/index.ts`, consumed by Tasks 2–11):

```ts
export async function assertCanWriteLead(user: AuthzUser, leadId: string): Promise<void>;
export async function assertCanWriteOpportunity(user: AuthzUser, opportunityId: string): Promise<void>;
export async function assertCanWriteContract(user: AuthzUser, contractId: string): Promise<void>;
export async function assertCanWriteTargetList(user: AuthzUser, listId: string): Promise<void>;
export async function assertCanWriteCrmTask(user: AuthzUser, taskId: string): Promise<void>;
export async function assertCanWriteOpportunityLineItem(user: AuthzUser, lineItemId: string): Promise<void>;
export async function assertCanWriteContractLineItem(user: AuthzUser, lineItemId: string): Promise<void>;
```

- Consumes: `AuthzUser` (`../session`), `AuthorizationError` (`../errors`), `prismadb`, and the existing `assertCanWriteOpportunity`/`assertCanWriteContract` (the line-item wrappers delegate to them).

- [ ] **Step 1: Write the failing unit tests**

Create `lib/authz/__tests__/scopes-crm-write.test.ts`:

```ts
import { AuthorizationError } from "../errors";

jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Leads: { findFirst: jest.fn() },
    crm_Opportunities: { findFirst: jest.fn() },
    crm_Contracts: { findFirst: jest.fn() },
    crm_TargetLists: { findFirst: jest.fn() },
    crm_Accounts_Tasks: { findFirst: jest.fn() },
    crm_OpportunityLineItems: { findUnique: jest.fn() },
    crm_ContractLineItems: { findUnique: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import {
  assertCanWriteLead,
  assertCanWriteOpportunity,
  assertCanWriteContract,
  assertCanWriteTargetList,
  assertCanWriteCrmTask,
  assertCanWriteOpportunityLineItem,
  assertCanWriteContractLineItem,
} from "../scopes/crm";

beforeEach(() => jest.clearAllMocks());

describe("assertCanWriteLead / Opportunity / Contract (assigned_to+createdBy, deletedAt)", () => {
  const cases = [
    ["Leads", assertCanWriteLead, prismadb.crm_Leads.findFirst as jest.Mock],
    ["Opportunities", assertCanWriteOpportunity, prismadb.crm_Opportunities.findFirst as jest.Mock],
    ["Contracts", assertCanWriteContract, prismadb.crm_Contracts.findFirst as jest.Mock],
  ] as const;

  for (const [label, assertFn, find] of cases) {
    it(`${label}: admin gets a bare id+deletedAt where`, async () => {
      find.mockResolvedValue({ id: "r1" });
      await assertFn({ id: "u", role: "admin" }, "r1");
      expect(find).toHaveBeenCalledWith({
        where: { id: "r1", deletedAt: null },
        select: { id: true },
      });
    });

    it(`${label}: user is scoped to assigned_to/createdBy`, async () => {
      find.mockResolvedValue({ id: "r1" });
      await assertFn({ id: "u3", role: "user" }, "r1");
      const arg = find.mock.calls[0][0]!;
      expect(arg.where).toMatchObject({
        id: "r1",
        deletedAt: null,
        OR: [{ assigned_to: "u3" }, { createdBy: "u3" }],
      });
    });

    it(`${label}: throws when not in scope`, async () => {
      find.mockResolvedValue(null);
      await expect(assertFn({ id: "u3", role: "user" }, "r1")).rejects.toBeInstanceOf(
        AuthorizationError
      );
    });
  }
});

describe("assertCanWriteTargetList (created_by only, no assigned_to)", () => {
  const find = prismadb.crm_TargetLists.findFirst as jest.Mock;

  it("admin: bare id+deletedAt", async () => {
    find.mockResolvedValue({ id: "l1" });
    await assertCanWriteTargetList({ id: "u", role: "admin" }, "l1");
    expect(find).toHaveBeenCalledWith({
      where: { id: "l1", deletedAt: null },
      select: { id: true },
    });
  });

  it("user: scoped to created_by (no assigned_to clause)", async () => {
    find.mockResolvedValue({ id: "l1" });
    await assertCanWriteTargetList({ id: "u3", role: "user" }, "l1");
    expect(find).toHaveBeenCalledWith({
      where: { id: "l1", deletedAt: null, created_by: "u3" },
      select: { id: true },
    });
  });

  it("throws when not in scope", async () => {
    find.mockResolvedValue(null);
    await expect(
      assertCanWriteTargetList({ id: "u3", role: "user" }, "l1")
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});

describe("assertCanWriteCrmTask (createdBy OR user assignee, no deletedAt)", () => {
  const find = prismadb.crm_Accounts_Tasks.findFirst as jest.Mock;

  it("admin: bare id where (no deletedAt column on this model)", async () => {
    find.mockResolvedValue({ id: "t1" });
    await assertCanWriteCrmTask({ id: "u", role: "manager" }, "t1");
    expect(find).toHaveBeenCalledWith({ where: { id: "t1" }, select: { id: true } });
  });

  it("user: scoped to creator or assignee", async () => {
    find.mockResolvedValue({ id: "t1" });
    await assertCanWriteCrmTask({ id: "u3", role: "user" }, "t1");
    expect(find).toHaveBeenCalledWith({
      where: { id: "t1", OR: [{ createdBy: "u3" }, { user: "u3" }] },
      select: { id: true },
    });
  });

  it("throws when not creator/assignee", async () => {
    find.mockResolvedValue(null);
    await expect(
      assertCanWriteCrmTask({ id: "u3", role: "user" }, "t1")
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});

describe("line-item wrappers delegate to the parent write assert", () => {
  it("opportunity line-item: resolves parent then asserts opportunity write", async () => {
    (prismadb.crm_OpportunityLineItems.findUnique as jest.Mock).mockResolvedValue({
      opportunityId: "opp1",
    });
    (prismadb.crm_Opportunities.findFirst as jest.Mock).mockResolvedValue({ id: "opp1" });
    await assertCanWriteOpportunityLineItem({ id: "u3", role: "user" }, "li1");
    expect(prismadb.crm_OpportunityLineItems.findUnique).toHaveBeenCalledWith({
      where: { id: "li1" },
      select: { opportunityId: true },
    });
    // parent write assert ran against the resolved opportunityId
    expect(prismadb.crm_Opportunities.findFirst).toHaveBeenCalled();
  });

  it("opportunity line-item: throws when the line item does not exist", async () => {
    (prismadb.crm_OpportunityLineItems.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(
      assertCanWriteOpportunityLineItem({ id: "u3", role: "user" }, "missing")
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("contract line-item: resolves parent then asserts contract write", async () => {
    (prismadb.crm_ContractLineItems.findUnique as jest.Mock).mockResolvedValue({
      contractId: "ct1",
    });
    (prismadb.crm_Contracts.findFirst as jest.Mock).mockResolvedValue({ id: "ct1" });
    await assertCanWriteContractLineItem({ id: "u3", role: "user" }, "cli1");
    expect(prismadb.crm_ContractLineItems.findUnique).toHaveBeenCalledWith({
      where: { id: "cli1" },
      select: { contractId: true },
    });
    expect(prismadb.crm_Contracts.findFirst).toHaveBeenCalled();
  });

  it("contract line-item: throws when the line item does not exist", async () => {
    (prismadb.crm_ContractLineItems.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(
      assertCanWriteContractLineItem({ id: "u3", role: "user" }, "missing")
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});
```

- [ ] **Step 2: Run to verify RED**

Run: `./node_modules/.bin/jest lib/authz/__tests__/scopes-crm-write.test.ts`
Expected: FAIL — the seven functions are not exported from `../scopes/crm`.

- [ ] **Step 3: Implement the helpers in `lib/authz/scopes/crm.ts`**

Append after `assertCanReadTargetList` (~line 392):

```ts
// ── Write-scope asserts (Workstream A — GHSA-qwhm-9fcm-p878) ─────────────────
// Mirror assertCanWriteAccount: admin/manager unrestricted; user scoped to the
// model's ownership columns. Exact columns differ per model — see each helper.

export async function assertCanWriteLead(
  user: AuthzUser,
  leadId: string,
): Promise<void> {
  const where =
    user.role === "admin" || user.role === "manager"
      ? { id: leadId, deletedAt: null }
      : { id: leadId, deletedAt: null, OR: [{ assigned_to: user.id }, { createdBy: user.id }] };
  const row = await prismadb.crm_Leads.findFirst({ where, select: { id: true } });
  if (!row) throw new AuthorizationError();
}

export async function assertCanWriteOpportunity(
  user: AuthzUser,
  opportunityId: string,
): Promise<void> {
  const where =
    user.role === "admin" || user.role === "manager"
      ? { id: opportunityId, deletedAt: null }
      : { id: opportunityId, deletedAt: null, OR: [{ assigned_to: user.id }, { createdBy: user.id }] };
  const row = await prismadb.crm_Opportunities.findFirst({ where, select: { id: true } });
  if (!row) throw new AuthorizationError();
}

export async function assertCanWriteContract(
  user: AuthzUser,
  contractId: string,
): Promise<void> {
  const where =
    user.role === "admin" || user.role === "manager"
      ? { id: contractId, deletedAt: null }
      : { id: contractId, deletedAt: null, OR: [{ assigned_to: user.id }, { createdBy: user.id }] };
  const row = await prismadb.crm_Contracts.findFirst({ where, select: { id: true } });
  if (!row) throw new AuthorizationError();
}

// crm_TargetLists has NO assigned_to — ownership is created_by only.
export async function assertCanWriteTargetList(
  user: AuthzUser,
  listId: string,
): Promise<void> {
  const where =
    user.role === "admin" || user.role === "manager"
      ? { id: listId, deletedAt: null }
      : { id: listId, deletedAt: null, created_by: user.id };
  const row = await prismadb.crm_TargetLists.findFirst({ where, select: { id: true } });
  if (!row) throw new AuthorizationError();
}

// crm_Accounts_Tasks has NO deletedAt (hard delete). Ownership = creator or assignee.
// NOTE: this covers creator/assignee. Broadening to parent-account writers is a
// deliberate, safe narrowing deferred here (it would only widen access).
export async function assertCanWriteCrmTask(
  user: AuthzUser,
  taskId: string,
): Promise<void> {
  const where =
    user.role === "admin" || user.role === "manager"
      ? { id: taskId }
      : { id: taskId, OR: [{ createdBy: user.id }, { user: user.id }] };
  const row = await prismadb.crm_Accounts_Tasks.findFirst({ where, select: { id: true } });
  if (!row) throw new AuthorizationError();
}

// Line items carry no ownership column; authority is the parent opportunity/contract
// (correct because a line-item write recomputes the parent's totals). Resolve the
// parent id from the line-item row, then delegate to the parent write assert.
export async function assertCanWriteOpportunityLineItem(
  user: AuthzUser,
  lineItemId: string,
): Promise<void> {
  const row = await prismadb.crm_OpportunityLineItems.findUnique({
    where: { id: lineItemId },
    select: { opportunityId: true },
  });
  if (!row) throw new AuthorizationError();
  await assertCanWriteOpportunity(user, row.opportunityId);
}

export async function assertCanWriteContractLineItem(
  user: AuthzUser,
  lineItemId: string,
): Promise<void> {
  const row = await prismadb.crm_ContractLineItems.findUnique({
    where: { id: lineItemId },
    select: { contractId: true },
  });
  if (!row) throw new AuthorizationError();
  await assertCanWriteContract(user, row.contractId);
}
```

- [ ] **Step 4: Re-export from `lib/authz/index.ts`**

After the block ending at line 56 (`assertCanReadTargetList`), add:

```ts
export {
  assertCanWriteLead,
  assertCanWriteOpportunity,
  assertCanWriteContract,
  assertCanWriteTargetList,
  assertCanWriteCrmTask,
  assertCanWriteOpportunityLineItem,
  assertCanWriteContractLineItem,
} from "./scopes/crm";
```

- [ ] **Step 5: GREEN + typecheck**

Run: `./node_modules/.bin/jest lib/authz/__tests__/scopes-crm-write.test.ts` — all pass.
Run: `pnpm exec tsc --noEmit` — clean.

- [ ] **Step 6: Commit**

```bash
git add lib/authz
git commit -m "feat(authz): write-scope asserts for lead, opportunity, contract, target-list, crm-task, line-items"
```

---

### Task 2: Guard Accounts actions

**Files:**
- Modify: `actions/crm/accounts/update-account.ts`, `delete-account.ts`, `watch-account.ts`, `unwatch-account.ts`, `create-task.ts`, `create-account.ts`
- Test: `actions/crm/accounts/__tests__/accounts-write-scope.test.ts` (new)

**Interfaces:**
- Consumes: `requireAuthenticated`, `assertCanWriteAccount` (existing), `AuthenticationError`, `AuthorizationError` from `@/lib/authz`.

- [ ] **Step 1: Write the failing tests**

Create `actions/crm/accounts/__tests__/accounts-write-scope.test.ts`. Mock `@/lib/authz` (with `requireAuthenticated`, `assertCanWriteAccount`, the two error classes), `@/lib/prisma` (`crm_Accounts.update`, `crm_Accounts_Tasks.create`, and the watcher junction helpers' underlying calls), `next/cache`, `@/lib/audit-log`, and `@/inngest/client`. For each of `updateAccount`, `deleteAccount`, `watchAccount`, `unwatchAccount`, `createTask`:

```ts
it("<action>: denies a non-owner and does not mutate", async () => {
  authed.mockResolvedValue({ id: "attacker", role: "user" });
  assertAccount.mockRejectedValue(new AuthorizationError());
  const res = await ACTION(VICTIM_ARGS);
  expect(res).toEqual({ error: "Forbidden" });
  expect(prismadb.crm_Accounts.update).not.toHaveBeenCalled();   // or crm_Accounts_Tasks.create for createTask
});

it("<action>: allows an owner and mutates", async () => {
  authed.mockResolvedValue({ id: "owner", role: "user" });
  assertAccount.mockResolvedValue(undefined);
  // set up the mutation mock to resolve
  const res = await ACTION(OWNER_ARGS);
  expect(assertAccount).toHaveBeenCalledWith({ id: "owner", role: "user" }, EXPECTED_ID);
  expect(/* the mutation */).toHaveBeenCalled();
});
```

Use these `EXPECTED_ID` values: `updateAccount` → `data.id`; `deleteAccount` → the `accountId` arg; `watchAccount`/`unwatchAccount` → the `accountId` arg; `createTask` → `data.account`.

- [ ] **Step 2: RED** — `./node_modules/.bin/jest actions/crm/accounts/__tests__/accounts-write-scope.test.ts` fails (guards absent; non-owner path still mutates).

- [ ] **Step 3: Apply the Guard Recipe to each action**

- `update-account.ts`: import `requireAuthenticated, assertCanWriteAccount, AuthenticationError, AuthorizationError`; replace the `getSession()` block; assert `assertCanWriteAccount(user, id)`; stamp `updatedBy: user.id`.
- `delete-account.ts`: same imports; assert `assertCanWriteAccount(user, accountId)`; stamp `deletedBy: user.id`.
- `watch-account.ts` / `unwatch-account.ts`: assert `assertCanWriteAccount(user, accountId)`. **Rationale (record in a code comment): `watchers` is inside `accountUserScopeOR`, so an unguarded watch self-grants read+write scope — an escalation primitive. Watch therefore requires write.**
- `create-task.ts`: assert `assertCanWriteAccount(user, data.account)` (parent-write). **Also fix the ownership-spoof: stamp `createdBy: user.id` (the authenticated caller), NOT the input `user` field. Keep the input `user` field only as the task assignee.**
- `create-account.ts`: plain create — replace `getSession()` with `requireAuthenticated()` (Unauthorized mapping only, no write assert — the row is owned by its creator); stamp `createdBy: user.id`.

- [ ] **Step 4: GREEN + typecheck**

Run the task's test file — all pass. Run `pnpm exec tsc --noEmit` — clean.

- [ ] **Step 5: Commit**

```bash
git add actions/crm/accounts
git commit -m "feat(authz): object-level authorization on account write actions"
```

---

### Task 3: Guard Contacts actions

**Files:**
- Modify: `actions/crm/contacts/update-contact.ts`, `delete-contact.ts`, `unlink-opportunity.ts`, `create-contact.ts`
- Test: `actions/crm/contacts/__tests__/contacts-write-scope.test.ts` (new)

**Interfaces:**
- Consumes: `requireAuthenticated`, `assertCanWriteContact` (existing), `assertCanWriteAccount` (existing), `assertCanWriteOpportunity` (Task 1), error classes.

- [ ] **Step 1: Write the failing tests** — mirror the Task-2 test shape for `updateContact`, `deleteContact`, `unlinkOpportunity`. `EXPECTED_ID`: `updateContact` → `data.id`; `deleteContact` → `contactId` arg; `unlinkOpportunity` → assert BOTH `assertCanWriteContact(user, contactId)` and `assertCanWriteOpportunity(user, opportunityId)` are called, and that a rejection from EITHER returns `{ error: "Forbidden" }` and skips the `contactsToOpportunities.delete`.

- [ ] **Step 2: RED** — run the test file, confirm failure.

- [ ] **Step 3: Apply guards**
- `update-contact.ts`: `assertCanWriteContact(user, data.id)`; stamp `updatedBy: user.id`. When `assigned_account` is being set, also `assertCanWriteAccount(user, assigned_account)` (parent-write on the newly-linked account).
- `delete-contact.ts`: `assertCanWriteContact(user, contactId)`.
- `unlink-opportunity.ts`: assert `assertCanWriteContact(user, contactId)` then `assertCanWriteOpportunity(user, opportunityId)` (bidirectional junction — both sides must be writable).
- `create-contact.ts`: `requireAuthenticated()`; when `assigned_account` supplied, `assertCanWriteAccount(user, assigned_account)` (parent-write); else plain create stamped `createdBy: user.id`.

- [ ] **Step 4: GREEN + typecheck.**
- [ ] **Step 5: Commit** — `git add actions/crm/contacts && git commit -m "feat(authz): object-level authorization on contact write actions"`

---

### Task 4: Guard Opportunities actions

**Files:**
- Modify: `actions/crm/opportunities/update-opportunity.ts`, `delete-opportunity.ts`, `create-opportunity.ts`
- Test: `actions/crm/opportunities/__tests__/opportunities-write-scope.test.ts` (new)

**Interfaces:** Consumes `requireAuthenticated`, `assertCanWriteOpportunity` (Task 1), `assertCanWriteAccount` (existing), error classes.

- [ ] **Step 1: Failing tests** — `updateOpportunity` (`EXPECTED_ID` = `data.id`), `deleteOpportunity` (= `opportunityId` arg). Assert non-owner → `{ error: "Forbidden" }`, no `crm_Opportunities.update`.
- [ ] **Step 2: RED.**
- [ ] **Step 3: Apply guards**
- `update-opportunity.ts`: `assertCanWriteOpportunity(user, data.id)` inserted **before** the existing `qualifiedEntryBlockReason` gate and `handleStageTransition` (the approval gate stays intact and runs after the authz assert). Stamp `updatedBy: user.id`.
- `delete-opportunity.ts`: `assertCanWriteOpportunity(user, opportunityId)`.
- `create-opportunity.ts`: `requireAuthenticated()`; when `account` supplied, `assertCanWriteAccount(user, account)` (parent-write); else plain create stamped `createdBy: user.id`.
- [ ] **Step 4: GREEN + typecheck.**
- [ ] **Step 5: Commit** — `git add actions/crm/opportunities && git commit -m "feat(authz): object-level authorization on opportunity write actions"`

---

### Task 5: Guard Opportunity line-items

**Files:**
- Modify: `actions/crm/opportunity-line-items/add-line-item/index.ts`, `update-line-item/index.ts`, `remove-line-item/index.ts`, `reorder-line-items/index.ts`, `get-line-items.ts`
- Test: `actions/crm/opportunity-line-items/__tests__/opp-line-items-write-scope.test.ts` (new)

**Interfaces:** Consumes `requireAuthenticated`, `assertCanWriteOpportunity`, `assertCanWriteOpportunityLineItem`, `assertCanReadOpportunity` (existing), error classes.

- [ ] **Step 1: Failing tests** covering: `addLineItem` asserts `assertCanWriteOpportunity(user, opportunityId)` (parent from input) and a rejection skips `create`; `updateLineItem`/`removeLineItem` assert `assertCanWriteOpportunityLineItem(user, id)` and a rejection skips the mutation; `reorderLineItems` — see Step 4 below — must reject the whole batch if any item's parent is not writable.
- [ ] **Step 2: RED.**
- [ ] **Step 3: Apply single-parent guards**
- `add-line-item/index.ts`: `assertCanWriteOpportunity(user, opportunityId)` (replaces the existing bare `findUnique` null-check; the assert already 404s on missing/soft-deleted via scope miss → `AuthorizationError`).
- `update-line-item/index.ts`: `assertCanWriteOpportunityLineItem(user, id)` (the helper resolves the parent).
- `remove-line-item/index.ts`: `assertCanWriteOpportunityLineItem(user, id)`.
- [ ] **Step 4: Guard the blind reorder** (`reorder-line-items/index.ts`). It receives `items: { id, sort_order }[]` with no parent id. Resolve every parent and assert each distinct one; reject the whole batch on any failure:

```ts
let user;
try { user = await requireAuthenticated(); }
catch (e) { if (e instanceof AuthenticationError) return { error: "Unauthorized" }; throw e; }

const ids = items.map((i) => i.id);
const rows = await prismadb.crm_OpportunityLineItems.findMany({
  where: { id: { in: ids } },
  select: { id: true, opportunityId: true },
});
// Any id that doesn't resolve, or any parent the user can't write, fails the batch.
if (rows.length !== ids.length) return { error: "Forbidden" };
const parents = [...new Set(rows.map((r) => r.opportunityId))];
try {
  for (const opportunityId of parents) await assertCanWriteOpportunity(user, opportunityId);
} catch (e) {
  if (e instanceof AuthorizationError) return { error: "Forbidden" };
  throw e;
}
// ...existing $transaction of updates unchanged.
```

- [ ] **Step 5: Guard the reader** (`get-line-items.ts`). Add `assertCanReadOpportunity(user, opportunityId)` after resolving the caller. If the `cache()` wrapper makes `requireAuthenticated()` unavailable at call time, resolve the user in the calling server component and pass it in; document whichever path is taken in a code comment. The reader must not return line items for an opportunity the caller cannot read.
- [ ] **Step 6: GREEN + typecheck.**
- [ ] **Step 7: Commit** — `git add actions/crm/opportunity-line-items && git commit -m "feat(authz): parent-scoped authorization on opportunity line-items (incl. blind reorder)"`

---

### Task 6: Guard Contracts actions

**Files:**
- Modify: `actions/crm/contracts/create-new-contract/index.ts`, `update-contract/index.ts`, `delete-contract/index.ts`
- Test: `actions/crm/contracts/__tests__/contracts-write-scope.test.ts` (new)

**Interfaces:** Consumes `requireAuthenticated`, `assertCanWriteContract` (Task 1), `assertCanWriteAccount` (existing), error classes.

- [ ] **Step 1: Failing tests** — `updateContract` (`EXPECTED_ID` = `data.id`), `deleteContract` (= `id`). Non-owner → `{ error: "Forbidden" }`, no `crm_Contracts.update`.
- [ ] **Step 2: RED.**
- [ ] **Step 3: Apply guards** — for each, **replace the `session.user.email` → `users.findUnique` lookup** with `requireAuthenticated()` (per the recipe note), then:
- `update-contract/index.ts`: `assertCanWriteContract(user, data.id)` before the `before` fetch; stamp `updatedBy`/`createdBy` from `user.id` as the file currently does.
- `delete-contract/index.ts`: `assertCanWriteContract(user, id)`.
- `create-new-contract/index.ts`: `requireAuthenticated()`; when `account` supplied, `assertCanWriteAccount(user, account)`; else plain create.
- [ ] **Step 4: GREEN + typecheck.**
- [ ] **Step 5: Commit** — `git add actions/crm/contracts && git commit -m "feat(authz): object-level authorization on contract write actions"`

---

### Task 7: Guard Contract line-items

**Files:**
- Modify: `actions/crm/contract-line-items/add-line-item/index.ts`, `copy-from-opportunity/index.ts`, `update-line-item/index.ts`, `remove-line-item/index.ts`, `reorder-line-items/index.ts`, `get-line-items.ts`
- Test: `actions/crm/contract-line-items/__tests__/contract-line-items-write-scope.test.ts` (new)

**Interfaces:** Consumes `requireAuthenticated`, `assertCanWriteContract`, `assertCanWriteContractLineItem`, `assertCanReadOpportunity`, `assertCanReadContract` (existing), error classes.

- [ ] **Step 1: Failing tests** — mirror Task 5, plus the dual-guard case for `copyFromOpportunity`.
- [ ] **Step 2: RED.**
- [ ] **Step 3: Apply guards**
- `add-line-item/index.ts`: `assertCanWriteContract(user, contractId)`.
- `update-line-item/index.ts` / `remove-line-item/index.ts`: `assertCanWriteContractLineItem(user, id)`.
- `copy-from-opportunity/index.ts`: **dual guard** — `assertCanWriteContract(user, contractId)` (destination) AND `assertCanReadOpportunity(user, opportunityId)` (source; read suffices since it is only copied from). Both must pass before `createMany`.
- [ ] **Step 4: Guard the blind reorder** (`reorder-line-items/index.ts`) — identical shape to Task 5 Step 4 but resolving `contractId` and asserting `assertCanWriteContract`:

```ts
const rows = await prismadb.crm_ContractLineItems.findMany({
  where: { id: { in: ids } },
  select: { id: true, contractId: true },
});
if (rows.length !== ids.length) return { error: "Forbidden" };
const parents = [...new Set(rows.map((r) => r.contractId))];
try {
  for (const contractId of parents) await assertCanWriteContract(user, contractId);
} catch (e) {
  if (e instanceof AuthorizationError) return { error: "Forbidden" };
  throw e;
}
```

- [ ] **Step 5: Guard the reader** (`get-line-items.ts`) — `assertCanReadContract(user, contractId)`, same caching caveat as Task 5 Step 5.
- [ ] **Step 6: GREEN + typecheck.**
- [ ] **Step 7: Commit** — `git add actions/crm/contract-line-items && git commit -m "feat(authz): parent-scoped authorization on contract line-items (incl. copy + reorder)"`

---

### Task 8: Guard Leads actions

**Files:**
- Modify: `actions/crm/leads/update-lead.ts`, `delete-lead.ts`, `create-lead.ts`
- Test: `actions/crm/leads/__tests__/leads-write-scope.test.ts` (new)

**Interfaces:** Consumes `requireAuthenticated`, `assertCanWriteLead` (Task 1), `assertCanWriteAccount` (existing), error classes.

- [ ] **Step 1: Failing tests** — `updateLead` (`EXPECTED_ID` = `data.id`), `deleteLead` (= `leadId`). Non-owner → `{ error: "Forbidden" }`, no `crm_Leads.update`.
- [ ] **Step 2: RED.**
- [ ] **Step 3: Apply guards**
- `update-lead.ts`: `assertCanWriteLead(user, data.id)`; stamp `updatedBy: user.id`.
- `delete-lead.ts`: `assertCanWriteLead(user, leadId)`.
- `create-lead.ts`: `requireAuthenticated()`; when `accountIDs` supplied, `assertCanWriteAccount(user, accountIDs)`; else plain create stamped with `assigned_to: assigned_to || user.id`.
- [ ] **Step 4: GREEN + typecheck.**
- [ ] **Step 5: Commit** — `git add actions/crm/leads && git commit -m "feat(authz): object-level authorization on lead write actions"`

---

### Task 9: Guard Targets actions

**Files:**
- Modify: `actions/crm/targets/update-target.ts`, `delete-target.ts`, `convert-target-to-deal.ts`, `create-target.ts`, `import-targets.ts`
- Test: `actions/crm/targets/__tests__/targets-write-scope.test.ts` (new)

**Interfaces:** Consumes `requireAuthenticated`, `assertCanWriteTarget` (existing), `assertCanWriteTargetList` (Task 1), error classes.

- [ ] **Step 1: Failing tests** — `updateTarget` (`EXPECTED_ID` = `data.id`), `deleteTarget` (= `targetId`), `convertTargetToDeal` (= `targetId`). Non-owner → `{ error: "Forbidden" }`, no mutation.
- [ ] **Step 2: RED.**
- [ ] **Step 3: Apply guards**
- `update-target.ts`: `assertCanWriteTarget(user, data.id)` (helper exists).
- `delete-target.ts`: `assertCanWriteTarget(user, targetId)`.
- `convert-target-to-deal.ts`: `assertCanWriteTarget(user, targetId)` before `convertTarget(targetId)`.
- `create-target.ts`: `requireAuthenticated()`; when the input links a target-list, `assertCanWriteTargetList(user, listId)`; else plain create stamped `created_by: user.id`.
- `import-targets.ts`: `requireAuthenticated()`; when it links a list, `assertCanWriteTargetList(user, listId)`; else plain bulk-create stamped `created_by: user.id`.
- [ ] **Step 4: GREEN + typecheck.**
- [ ] **Step 5: Commit** — `git add actions/crm/targets && git commit -m "feat(authz): object-level authorization on target write actions"`

---

### Task 10: Guard Target-lists actions

**Files:**
- Modify: `actions/crm/target-lists/update-target-list.ts`, `delete-target-list.ts`, `add-targets-to-list.ts`, `remove-target-from-list.ts`, `create-target-list.ts`
- Test: `actions/crm/target-lists/__tests__/target-lists-write-scope.test.ts` (new)

**Interfaces:** Consumes `requireAuthenticated`, `assertCanWriteTargetList` (Task 1), `filterAuthorizedTargetIds` (existing), error classes.

- [ ] **Step 1: Failing tests** — `updateTargetList` (`EXPECTED_ID` = `id`), `deleteTargetList` (= `targetListId`), `addTargetsToList` (= `targetListId`), `removeTargetFromList` (= `targetListId`). Non-owner → `{ error: "Forbidden" }`, no mutation.
- [ ] **Step 2: RED.**
- [ ] **Step 3: Apply guards**
- `update-target-list.ts`: `assertCanWriteTargetList(user, id)`.
- `delete-target-list.ts`: `assertCanWriteTargetList(user, targetListId)`.
- `add-targets-to-list.ts`: `assertCanWriteTargetList(user, targetListId)`; additionally narrow the incoming `targetIds` through `filterAuthorizedTargetIds(user, targetIds)` so a caller cannot attach targets they cannot access, and `createMany` only the authorized subset.
- `remove-target-from-list.ts`: `assertCanWriteTargetList(user, targetListId)`.
- `create-target-list.ts`: `requireAuthenticated()`; plain create stamped `created_by: user.id`. When `targetIds` are supplied inline, narrow with `filterAuthorizedTargetIds(user, targetIds)`.
- [ ] **Step 4: GREEN + typecheck.**
- [ ] **Step 5: Commit** — `git add actions/crm/target-lists && git commit -m "feat(authz): object-level authorization on target-list write actions"`

---

### Task 11: Guard CRM tasks actions

**Files:**
- Modify: `actions/crm/tasks/add-comment.ts`, `assign-document.ts`, `delete-task.ts`
- Test: `actions/crm/tasks/__tests__/crm-tasks-write-scope.test.ts` (new)

**Interfaces:** Consumes `requireAuthenticated`, `assertCanWriteCrmTask` (Task 1), error classes.

- [ ] **Step 1: Failing tests** — `addComment` (`EXPECTED_ID` = `taskId`), both `assignDocumentToCrmTask` and `disconnectDocumentFromCrmTask` (= `taskId`), `deleteTask` (= `taskId`). Non-owner → `{ error: "Forbidden" }`, and no `tasksComments.create` / no `crm_Accounts_Tasks.delete`.
- [ ] **Step 2: RED.**
- [ ] **Step 3: Apply guards** — `assertCanWriteCrmTask(user, taskId)` at the top of `addComment`, both exports of `assign-document.ts`, and `deleteTask`. Note `delete-task.ts` is a hard delete (no `deletedAt` on the model) — the guard precedes the comment/doc-link/task deletion cascade.
- [ ] **Step 4: GREEN + typecheck.**
- [ ] **Step 5: Commit** — `git add actions/crm/tasks && git commit -m "feat(authz): object-level authorization on CRM task write actions"`

---

### Task 12: Whole-branch verification + advisory note

**Files:**
- Modify: `docs/superpowers/specs/2026-07-20-crm-server-action-authz-design.md` (mark implemented)

- [ ] **Step 1: Full suite** — `./node_modules/.bin/jest` — all pass (baseline 204 suites / 1096 tests plus every new scope suite, 0 failures).
- [ ] **Step 2: Typecheck + build** — `pnpm exec tsc --noEmit && pnpm build` — both succeed.
- [ ] **Step 3: Coverage sweep** — grep every guarded directory to confirm no mutating `"use server"` action under `actions/crm/{accounts,contacts,leads,opportunities,contracts,opportunity-line-items,contract-line-items,targets,target-lists,tasks}` still lacks an `assertCanWrite*`/`requireAuthenticated` call. List any stragglers; a straggler is a failed task, not a note.
- [ ] **Step 4: Mark the spec implemented** and record the residual follow-ups (the `create-task` assignee-spoof note if not fully addressed; parent-account-writer broadening of `assertCanWriteCrmTask`; the two `get-line-items` caching caveats).
- [ ] **Step 5: Commit (no push — final review first)**

```bash
git add docs/superpowers/specs/2026-07-20-crm-server-action-authz-design.md
git commit -m "docs: mark CRM server-action authz workstream implemented"
```

---

## Notes for the executor

- The Guard Recipe and Action-test Recipe in Global Constraints are exact code to apply verbatim with the named substitutions — they are the single source for the boilerplate so each task lists only its per-action deltas (imports, the assert call, the id).
- Line-item Tasks 5 and 7 are the only non-mechanical ones: the blind `reorder` endpoints and the dual-guard `copy-from-opportunity` need the full code shown in their steps.
- If any action's real signature differs from what a task states (e.g. positional vs object arg), follow the actual file — the recipe's substitution (`EXPECTED_ID`) is what matters, not the arg shape.
- Every scope test must fail with the guard removed. If a test passes against the pre-fix action, it is not testing the guard — fix the test before moving on.
