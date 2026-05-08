# Permission-Driven Authorization — Phase D1 (Accounts Read-Side) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Add user/manager/admin scoping to every CRM account read action. After D1, a `user` sees only accounts they're assigned to, created, or watch; `manager`/`admin` see all non-deleted accounts. This also adds reusable `accountUserScopeOR` and `accountReadScopeWhere` helpers that D2 will compose into linked-account checks for leads/contacts/opportunities/contracts.

**Architecture:** Extend `lib/authz/scopes/crm.ts` with a single private helper `accountUserScopeOR(userId)` returning the `OR` array (`assigned_to | createdBy | watcher`) and an exported `accountReadScopeWhere(user)` building the full where (with `deletedAt: null` and the role gate). Apply to 3 read actions. The previously shipped `assertCanReadAccount` (none yet — `assertCanWriteAccount` exists from B2) is added too, mirroring the contact/target read assertion pattern.

**Spec source:** §6.1 (CRM accounts), §8.1, §12 Phase 4.
**Audit source:** "Global CRM Read Actions" — accounts row.

---

## File Structure

**New tests:**
- `lib/authz/__tests__/scopes-crm-account-read.test.ts`
- `actions/crm/accounts/__tests__/get-accounts-scope.test.ts`
- `actions/crm/accounts/__tests__/get-account-by-id-scope.test.ts`
- `actions/crm/accounts/__tests__/search-accounts-scope.test.ts`

**Modified:**
- `lib/authz/scopes/crm.ts` — add `accountUserScopeOR` (private), `accountReadScopeWhere`, `assertCanReadAccount`
- `lib/authz/index.ts` — re-export
- `actions/crm/accounts/get-accounts.ts`
- `actions/crm/accounts/get-account-by-id.ts`
- `actions/crm/accounts/search-accounts.ts`

---

## Task 1: Account scope helpers + `assertCanReadAccount`

**Files:**
- Modify: `lib/authz/scopes/crm.ts`
- Create: `lib/authz/__tests__/scopes-crm-account-read.test.ts`
- Modify: `lib/authz/index.ts`

Add three pieces:

```ts
// Internal: the OR clauses describing user-level account ownership.
// Exported via accountReadScopeWhere; D2 will reuse for nested linked-account scope.
export function accountUserScopeOR(userId: string) {
  return [
    { assigned_to: userId },
    { createdBy: userId },
    { watchers: { some: { user_id: userId } } },
  ] as const;
}

// Build a Prisma where for "this user can read this account".
// Manager/admin: { deletedAt: null }
// User:           { deletedAt: null, OR: accountUserScopeOR(user.id) }
export function accountReadScopeWhere(user: AuthzUser) {
  if (user.role === "admin" || user.role === "manager") {
    return { deletedAt: null };
  }
  return {
    deletedAt: null,
    OR: accountUserScopeOR(user.id),
  };
}

// Throws AuthorizationError if user can't read this account.
export async function assertCanReadAccount(
  user: AuthzUser,
  accountId: string,
): Promise<void> {
  const row = await prismadb.crm_Accounts.findFirst({
    where: { id: accountId, ...accountReadScopeWhere(user) },
    select: { id: true },
  });
  if (!row) throw new AuthorizationError();
}
```

- [ ] **Step 1: Failing test**

```ts
// lib/authz/__tests__/scopes-crm-account-read.test.ts
import { AuthorizationError } from "../errors";

jest.mock("@/lib/prisma", () => ({
  prismadb: { crm_Accounts: { findFirst: jest.fn() } },
}));

import { prismadb } from "@/lib/prisma";
import {
  accountUserScopeOR,
  accountReadScopeWhere,
  assertCanReadAccount,
} from "../scopes/crm";

const find = prismadb.crm_Accounts.findFirst as jest.MockedFunction<
  typeof prismadb.crm_Accounts.findFirst
>;
beforeEach(() => jest.clearAllMocks());

describe("accountUserScopeOR", () => {
  it("returns three OR clauses for the user id", () => {
    expect(accountUserScopeOR("u1")).toEqual([
      { assigned_to: "u1" },
      { createdBy: "u1" },
      { watchers: { some: { user_id: "u1" } } },
    ]);
  });
});

describe("accountReadScopeWhere", () => {
  it("admin / manager → only deletedAt:null", () => {
    expect(accountReadScopeWhere({ id: "x", role: "admin" })).toEqual({ deletedAt: null });
    expect(accountReadScopeWhere({ id: "x", role: "manager" })).toEqual({ deletedAt: null });
  });
  it("user → deletedAt + OR ownership clauses", () => {
    expect(accountReadScopeWhere({ id: "u1", role: "user" })).toMatchObject({
      deletedAt: null,
      OR: expect.arrayContaining([
        { assigned_to: "u1" },
        { createdBy: "u1" },
        { watchers: { some: { user_id: "u1" } } },
      ]),
    });
  });
});

describe("assertCanReadAccount", () => {
  it("throws when not in scope", async () => {
    find.mockResolvedValue(null);
    await expect(assertCanReadAccount({ id: "u", role: "user" }, "a1"))
      .rejects.toBeInstanceOf(AuthorizationError);
  });
  it("admin: no OR clauses in where (just id + deletedAt)", async () => {
    find.mockResolvedValue({ id: "a1" } as any);
    await assertCanReadAccount({ id: "x", role: "admin" }, "a1");
    expect(find).toHaveBeenCalledWith({
      where: { id: "a1", deletedAt: null },
      select: { id: true },
    });
  });
});
```

- [ ] **Step 2: Failing test → implement → PASS**

- [ ] **Step 3: Add to barrel**

```ts
export {
  accountUserScopeOR,
  accountReadScopeWhere,
  assertCanReadAccount,
} from "./scopes/crm";
```

- [ ] **Step 4: Commit**

```bash
git add lib/authz/scopes/crm.ts lib/authz/__tests__/scopes-crm-account-read.test.ts lib/authz/index.ts
git commit -m "feat(authz): add account read-scope helpers"
```

---

## Task 2: Patch `getAccounts`

**Files:**
- Modify: `actions/crm/accounts/get-accounts.ts`
- Create: `actions/crm/accounts/__tests__/get-accounts-scope.test.ts`

Current behavior: lists ALL non-deleted accounts with no auth check. After D1: `requireAuthenticated` + `accountReadScopeWhere(user)`.

- [ ] **Step 1: Failing test** — 4 cases:
  - 401 unauth → `prismadb.crm_Accounts.findMany` not called
  - user → where contains `OR: [...accountUserScopeOR("u")...]`
  - manager → where = `{ deletedAt: null }` (no OR)
  - admin → same as manager

Mock `@/lib/auth-server`, `@/lib/prisma` (`users.findUnique`, `crm_Accounts.findMany`).

- [ ] **Step 2: Patch action**

```ts
import {
  requireAuthenticated,
  accountReadScopeWhere,
  AuthenticationError,
} from "@/lib/authz";

export async function getAccounts(/* existing args */) {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    throw e;
  }

  const where = accountReadScopeWhere(user);
  return prismadb.crm_Accounts.findMany({
    where,
    // ... existing select / orderBy / take / skip preserved
  });
}
```

If the action is currently called without arguments and returns the array directly, preserve that contract — wrap auth failures in whatever shape callers expect (Phase A-style: return empty array or throw — match the file's existing style).

- [ ] **Step 3: Test → PASS, commit**

```bash
git add actions/crm/accounts/get-accounts.ts actions/crm/accounts/__tests__/get-accounts-scope.test.ts
git commit -m "fix(crm): scope account list by user/manager/admin role"
```

---

## Task 3: Patch `getAccountById`

**Files:**
- Modify: `actions/crm/accounts/get-account-by-id.ts`
- Create: `actions/crm/accounts/__tests__/get-account-by-id-scope.test.ts`

Use `assertCanReadAccount` first (returns null/throws on out-of-scope), then existing detail query.

- [ ] **Step 1: Failing test** — 4 cases (401, 404 out-of-scope, 200 owner, 200 manager).

- [ ] **Step 2: Patch action**

```ts
import {
  requireAuthenticated,
  assertCanReadAccount,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export async function getAccountById(accountId: string) {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return null; // or { error: "Unauthorized" }
    throw e;
  }
  try {
    await assertCanReadAccount(user, accountId);
  } catch (e) {
    if (e instanceof AuthorizationError) return null;
    throw e;
  }
  // existing detail query (unchanged)
  return prismadb.crm_Accounts.findUnique({ where: { id: accountId, deletedAt: null }, /* existing include */ });
}
```

Match the existing return contract (some actions return the row directly; some return `{ data | error }`). Don't change the contract — only inject the gate.

- [ ] **Step 3: Test → PASS, commit**

```bash
git add actions/crm/accounts/get-account-by-id.ts actions/crm/accounts/__tests__/get-account-by-id-scope.test.ts
git commit -m "fix(crm): require account read scope on getAccountById"
```

---

## Task 4: Patch `searchAccounts`

**Files:**
- Modify: `actions/crm/accounts/search-accounts.ts`
- Create: `actions/crm/accounts/__tests__/search-accounts-scope.test.ts`

Same pattern as `getAccounts` — auth + spread `accountReadScopeWhere(user)` into the existing where.

- [ ] **Step 1: Failing test** — 3 cases (401, user → scoped where, manager → bare).

- [ ] **Step 2: Patch**

```ts
const where = {
  ...accountReadScopeWhere(user),
  ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
};
```

- [ ] **Step 3: Test → PASS, commit**

```bash
git add actions/crm/accounts/search-accounts.ts actions/crm/accounts/__tests__/search-accounts-scope.test.ts
git commit -m "fix(crm): scope account search by user/manager/admin role"
```

---

## Task 5: Verification + PR

- [ ] **Step 1: Full suite + grep for residual unscoped account reads**

```bash
pnpm jest 2>&1 | tail -8
grep -rn "prismadb\.crm_Accounts\.\(findMany\|findUnique\|findFirst\)" actions/ app/api/ --include="*.ts" | grep -v "__tests__\|scopes/crm" | head
```
The grep result should show only call sites that already have a scope layer above them or are intentionally global (e.g., similarity worker, admin tooling).

- [ ] **Step 2: Push + PR**

```bash
git push -u origin feat/authz-phase-d1
gh pr create --base dev --head feat/authz-phase-d1 --title "fix(security): scope CRM account reads by role (Phase D1)" --body "..."
```

PR body references: spec §6.1, this plan, and notes that D2 will build linked-account scope on top.

---

## Acceptance Criteria

- `getAccounts`, `getAccountById`, `searchAccounts` reject unauthenticated callers and apply user-level ownership filter.
- `accountUserScopeOR(userId)` is exported and ready for D2 nested-scope reuse.
- `assertCanReadAccount` follows the same pattern as `assertCanReadContact`/`assertCanReadTarget`.
- New tests cover unauth/user/manager/admin shapes.

## Out of D1 scope

- Account `restore-account.ts` (admin-only — already gated separately)
- Account-level write actions (already gated)
- Linked-account scope on leads/contacts/opportunities/contracts — **D2**
