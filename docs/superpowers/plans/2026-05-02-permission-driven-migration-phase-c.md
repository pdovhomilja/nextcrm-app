# Permission-Driven Authorization — Phase C (Admin Action Lockdown) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Close the remaining unguarded admin server actions and normalize every admin guard to the canonical `requireRole(["admin"])` helper. After C, no admin action is callable from a non-admin session, and zero authorization decisions reference legacy `session.user.role === "admin"` strings or `user.is_admin` booleans.

**Architecture:** Mechanical refactor — every targeted file replaces its current auth check with the canonical pattern:

```ts
import {
  requireRole,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

// At the top of every exported async function (or via a private ensureAdmin helper):
let actor;
try {
  actor = await requireRole(["admin"]);
} catch (e) {
  if (e instanceof AuthenticationError) return { error: "Unauthorized" };
  if (e instanceof AuthorizationError) return { error: "Forbidden" };
  throw e;
}
```

For files that THROW on errors instead of returning `{ error }`, throw `Error("Unauthorized")` / `Error("Forbidden")` instead.

**Spec source:** §12 Phase 3, §8.18.
**Audit source:** "Admin CRM Settings Actions Without Admin Check" (resolved Phase A), "Admin Currency Actions Without Admin Check" (resolved Phase A), and the residual list flagged in §3.3.

---

## File List

| File | Current state | Return shape |
|---|---|---|
| `actions/admin/users/activate-user.ts` | **NO ROLE CHECK** | `{ data \| error }` |
| `actions/admin/users/deactivate-user.ts` | **NO ROLE CHECK** | `{ data \| error }` |
| `actions/admin/users/delete-user.ts` | legacy `session.user.role` | `{ data \| error }` |
| `actions/admin/users/invite-user.ts` | legacy `session.user.role` | `{ data \| error }` |
| `actions/admin/send-mail-to-all/index.ts` | legacy `session.user.role` | `{ error \| ok }` |
| `app/[locale]/(routes)/admin/invoices/settings/_actions/invoice-settings.ts` | legacy `user.is_admin` | `{ ok \| error }` |
| `app/[locale]/(routes)/admin/actions/api-keys.ts` (3 functions: get/upsert/delete) | legacy `session.user.role` | throws |

Files already guarded canonically (Phase A): `crm-settings.ts`, `currencies.ts`, `set-role.ts`. **Skip.**

---

## Task 1: Fix `activate-user.ts` and `deactivate-user.ts` (critical — no current guards)

**Files:**
- Modify: `actions/admin/users/activate-user.ts`
- Modify: `actions/admin/users/deactivate-user.ts`
- Create: `actions/admin/users/__tests__/activate-deactivate.test.ts`

- [ ] **Step 1: Failing test**

`actions/admin/users/__tests__/activate-deactivate.test.ts`:
```ts
jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn(), update: jest.fn().mockResolvedValue({ id: "x" }) },
  },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { activateUser } from "../activate-user";
import { deactivateUser } from "../deactivate-user";

const gs = getSession as jest.MockedFunction<typeof getSession>;
const fu = prismadb.users.findUnique as jest.MockedFunction<typeof prismadb.users.findUnique>;
const upd = prismadb.users.update as jest.MockedFunction<typeof prismadb.users.update>;

beforeEach(() => jest.clearAllMocks());

describe.each([
  ["activateUser", activateUser],
  ["deactivateUser", deactivateUser],
])("%s admin gate", (_, fn) => {
  it("Unauthorized when no session", async () => {
    gs.mockResolvedValue(null as any);
    const res = await fn("u1");
    expect(res).toEqual({ error: "Unauthorized" });
    expect(upd).not.toHaveBeenCalled();
  });

  it("Forbidden when not admin", async () => {
    gs.mockResolvedValue({ user: { id: "u" } } as any);
    fu.mockResolvedValue({ id: "u", role: "user" } as any);
    const res = await fn("target");
    expect(res).toEqual({ error: "Forbidden" });
    expect(upd).not.toHaveBeenCalled();
  });

  it("admin succeeds", async () => {
    gs.mockResolvedValue({ user: { id: "a" } } as any);
    fu.mockResolvedValue({ id: "a", role: "admin" } as any);
    upd.mockResolvedValue({ id: "target" } as any);
    const res = await fn("target");
    expect(res).toMatchObject({ data: expect.anything() });
    expect(upd).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run failing test**

```bash
pnpm jest 'actions/admin/users/__tests__/activate-deactivate.test.ts'
```

- [ ] **Step 3: Patch both files**

For each (`activate-user.ts` and `deactivate-user.ts`), replace the opening session check with:
```ts
"use server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  requireRole,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export const activateUser = async (userId: string) => { // or deactivateUser
  try {
    await requireRole(["admin"]);
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }

  // existing body unchanged: status update, revalidatePath, return { data }
};
```

Preserve every existing line of business logic — only swap the guard.

- [ ] **Step 4: Test → PASS**

- [ ] **Step 5: Commit**

```bash
git add actions/admin/users/activate-user.ts actions/admin/users/deactivate-user.ts actions/admin/users/__tests__/activate-deactivate.test.ts
git commit -m "fix(admin): require admin role on activate/deactivate user (close audit gap)"
```

---

## Task 2: Normalize `delete-user.ts` and `invite-user.ts`

**Files:**
- Modify: `actions/admin/users/delete-user.ts`
- Modify: `actions/admin/users/invite-user.ts`

These already have admin checks via legacy `session.user.role === "admin"`. Switch to `requireRole(["admin"])` for consistency with Phase A patterns.

- [ ] **Step 1: For each file**, replace the existing `if (!session) ... if (session.user.role !== "admin") ...` block with the canonical pattern:

```ts
import { requireRole, AuthenticationError, AuthorizationError } from "@/lib/authz";

export const deleteUser = async (userId: string) => {
  try {
    await requireRole(["admin"]);
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }

  // existing body unchanged
};
```

For `invite-user.ts`, the `actor.id` value (used in audit logging or owner-stamping) was previously read from `session.user.id` — now read from the result of `requireRole`:
```ts
let actor;
try { actor = await requireRole(["admin"]); }
catch (e) { /* same shape */ }
// ... use actor.id where session.user.id was used
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm tsc --noEmit 2>&1 | grep -E "delete-user|invite-user" | head
```
Expected: no new errors in these files.

- [ ] **Step 3: Run any existing tests for these files**

```bash
pnpm jest 'actions/admin/users' 2>&1 | tail -10
```
If existing tests break because they didn't mock `prismadb.users.findUnique` (which `requireRole` calls under the hood), update mocks the same way Phase A T14 did for `crm-settings-actions.test.ts`.

- [ ] **Step 4: Commit**

```bash
git add actions/admin/users/delete-user.ts actions/admin/users/invite-user.ts
git commit -m "refactor(admin): normalize delete-user and invite-user to canonical requireRole helper"
```

---

## Task 3: Normalize `send-mail-to-all/index.ts`

**Files:**
- Modify: `actions/admin/send-mail-to-all/index.ts`

Same pattern. The handler is wrapped by `createSafeAction` — find the inner handler function, replace the auth block with `requireRole(["admin"])` returning `{ error: "Unauthorized" | "Forbidden" }`.

- [ ] **Step 1: Read the file** — note the inner handler function name and current auth check.

- [ ] **Step 2: Apply the canonical pattern** — same shape as Tasks 1/2.

- [ ] **Step 3: Typecheck + commit**

```bash
git add actions/admin/send-mail-to-all/index.ts
git commit -m "refactor(admin): normalize send-mail-to-all to canonical requireRole helper"
```

---

## Task 4: Normalize `admin/invoices/settings`

**Files:**
- Modify: `app/[locale]/(routes)/admin/invoices/settings/_actions/invoice-settings.ts`

Currently uses `user.is_admin` boolean. Replace with `requireRole(["admin"])`.

- [ ] **Step 1: Read the file** — note the export(s). Plan calls out one export `saveInvoiceSettings` returning `{ ok | error }`.

- [ ] **Step 2: Replace the `getUser()` + `user.is_admin` block with `requireRole(["admin"])`**:

```ts
import { requireRole, AuthenticationError, AuthorizationError } from "@/lib/authz";

export async function saveInvoiceSettings(input: InvoiceSettingsInput) {
  try {
    await requireRole(["admin"]);
  } catch (e) {
    if (e instanceof AuthenticationError) return { ok: false, error: "Unauthorized" };
    if (e instanceof AuthorizationError) return { ok: false, error: "Forbidden" };
    throw e;
  }

  // existing body unchanged
}
```

If the function uses `user.id` elsewhere in the body, capture it from `requireRole`:
```ts
let actor;
try { actor = await requireRole(["admin"]); }
catch (e) { /* ... */ }
// use actor.id where user.id was used
```

- [ ] **Step 3: Typecheck + commit**

```bash
git add 'app/[locale]/(routes)/admin/invoices/settings/_actions/invoice-settings.ts'
git commit -m "refactor(admin): normalize invoice-settings to canonical requireRole helper"
```

---

## Task 5: Normalize admin/actions/api-keys

**Files:**
- Modify: `app/[locale]/(routes)/admin/actions/api-keys.ts` (3 functions: `getSystemApiKeys`, `upsertSystemApiKey`, `deleteSystemApiKey`)

These currently throw `Error("Unauthorized")` from a legacy `session.user.role !== "admin"` check.

- [ ] **Step 1: Replace the auth section of each function with the throwing variant**:

```ts
import { requireRole, AuthenticationError, AuthorizationError } from "@/lib/authz";

async function ensureAdmin() {
  try {
    await requireRole(["admin"]);
  } catch (e) {
    if (e instanceof AuthenticationError) throw new Error("Unauthorized");
    if (e instanceof AuthorizationError) throw new Error("Forbidden");
    throw e;
  }
}

export async function getSystemApiKeys() {
  await ensureAdmin();
  // existing body
}
// Same pattern in upsert + delete.
```

- [ ] **Step 2: Typecheck + commit**

```bash
git add 'app/[locale]/(routes)/admin/actions/api-keys.ts'
git commit -m "refactor(admin): normalize system-api-keys actions to canonical requireRole helper"
```

---

## Task 6: Verification + PR

- [ ] **Step 1: Final search for residual legacy patterns in admin actions**

```bash
grep -rn "is_admin\|session\.user\.role" actions/admin/ 'app/[locale]/(routes)/admin/' 2>/dev/null | grep -v "__tests__\|node_modules\|migrations" | head
```
Expected: empty (or only references inside comments/test files).

- [ ] **Step 2: Full suite**

```bash
pnpm jest 2>&1 | tail -8
```
Expected: same baseline failure pattern as B3 merged into dev. New `activate-deactivate.test.ts` passes.

- [ ] **Step 3: Push + PR**

```bash
git push -u origin feat/authz-phase-c
gh pr create --base dev --head feat/authz-phase-c --title "fix(security): admin server action lockdown (Phase C)" --body "..."
```

PR body references: spec §8.18, plan, manual test plan (one curl per affected action — should return Unauthorized/Forbidden for non-admin sessions).

---

## Acceptance Criteria

- `activate-user.ts` and `deactivate-user.ts` reject non-admin sessions (closes audit gap).
- All 7 admin action files use `requireRole(["admin"])` as the sole auth gate.
- No remaining `session.user.role === "admin"` or `user.is_admin` references in admin actions.
- New unit test verifies activate/deactivate are role-gated; existing tests still pass.

## Out of C scope

- Read-side scoping for any resource (Phase D).
- Removing `Users.is_admin` column (Phase F — there are still consumers in non-admin code paths).
- Profile API keys (`profile/actions/api-keys.ts`) — user-scoped, not admin.
