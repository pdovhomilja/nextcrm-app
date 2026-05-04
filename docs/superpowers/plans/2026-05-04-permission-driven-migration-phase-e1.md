# Permission-Driven Authorization — Phase E1 (Products + Account-Products + Invoice list-scoping) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Add role-based authorization to the products module, account-product assignments, and the only remaining unscoped invoice read action (`get-invoices-by-accountId`). Bundles three small areas because they share the account-scope helpers shipped in D1/D2.

**Product policy decision (spec §15.2):** This plan applies the spec's recommended default — **products are catalog data shared across accounts, so mutations are manager/admin only**. Reads stay open to authenticated users (every role uses products in invoices/contracts/opportunity line items). If you want user-owned products instead, swap manager-only mutations for `createdBy`-based scope and add ownership checks to update/delete.

**Architecture:**
1. Products: read = `requireAuthenticated` (any role); create/update/delete/import = `requireRole(["manager", "admin"])`.
2. Account-products: assignment is account write — use `assertCanWriteAccount(user, accountId)`. Reads use `assertCanReadAccount`.
3. Invoice list-by-account: same pattern — `assertCanReadAccount` then list with existing where, no extra invoice scope helper needed (B2 already covers per-row read via `canReadInvoice`).

**Spec source:** §6.6 (Products), §6.7 (Account-products), §6.11/§7.6 (invoice reads), §8.6, §8.13, §12 Phase 5.
**Audit source:** Implicit — products were not in the original audit but flagged in spec §6 review.

**Depends on:** D1+D2+D3 merged (`assertCanReadAccount`, `assertCanWriteAccount`).

---

## File Structure

**New tests:**
- `actions/crm/products/__tests__/create-product-scope.test.ts`
- `actions/crm/products/__tests__/update-product-scope.test.ts`
- `actions/crm/products/__tests__/delete-product-scope.test.ts`
- `actions/crm/products/__tests__/import-products-scope.test.ts`
- `actions/crm/products/__tests__/get-products-scope.test.ts`
- `actions/crm/products/__tests__/get-product-scope.test.ts`
- `actions/crm/account-products/__tests__/assign-product-scope.test.ts`
- `actions/crm/account-products/__tests__/update-assignment-scope.test.ts`
- `actions/crm/account-products/__tests__/remove-assignment-scope.test.ts`
- `actions/crm/account-products/__tests__/get-account-products-scope.test.ts`
- `actions/invoices/__tests__/get-invoices-by-accountId-scope.test.ts`

**Modified:**
- `actions/crm/products/{create,update,delete}-product/index.ts`, `import-products.ts`
- `actions/crm/products/get-product.ts`, `get-products.ts`
- `actions/crm/account-products/{assign,update,remove}*/index.ts`, `get-account-products.ts`
- `actions/invoices/get-invoices-by-accountId.ts`

---

## Task 1: Product mutation gates (manager+)

**Files:** `create-product`, `update-product`, `delete-product`, `import-products`.

For each, replace the `getSession` block with `requireRole(["manager", "admin"])`. Match existing return contract (each currently returns `{data|error}` via createSafeAction).

- [ ] **Step 1**: One test file per action — 3 cases (401 unauth, 403 user-role rejected, 200 manager succeeds, 200 admin succeeds — 4 cases combined).
- [ ] **Step 2**: Patch each:
  ```ts
  import { requireRole, AuthenticationError, AuthorizationError } from "@/lib/authz";

  // inside handler:
  let actor;
  try { actor = await requireRole(["manager", "admin"]); }
  catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }
  // existing body — replace `session.user.id` with `actor.id`
  ```
- [ ] **Step 3**: Commit: `fix(products): require manager/admin role on product mutations`

---

## Task 2: Product reads (any authenticated role)

**Files:** `get-product.ts`, `get-products.ts`.

Both currently have NO auth check. Add `requireAuthenticated` only — no scope filter (catalog data is global).

- [ ] **Step 1**: Test files — 2 cases each (401 unauth → empty/null, 200 user/manager/admin → data).
- [ ] **Step 2**: Patch — `requireAuthenticated` with `AuthenticationError → return [] | null` per existing contract.
- [ ] **Step 3**: Commit: `fix(products): require authentication on product read actions`

---

## Task 3: Account-product assignments

**Files:** `assign-product/index.ts`, `update-assignment/index.ts`, `remove-assignment/index.ts`.

Mutations require **account write access** (manager/admin can write any; user must own the account via assigned_to/createdBy/watcher). Use `assertCanWriteAccount`.

- [ ] **Step 1**: Test files — 4 cases per action (401, account-out-of-scope → forbidden, in-scope user → success, manager → success).
- [ ] **Step 2**: Patch each:
  ```ts
  import {
    requireAuthenticated,
    assertCanWriteAccount,
    AuthenticationError,
    AuthorizationError,
  } from "@/lib/authz";

  let user;
  try { user = await requireAuthenticated(); }
  catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    throw e;
  }
  try { await assertCanWriteAccount(user, accountId); }
  catch (e) {
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }
  // existing body — accountId for assign comes from input.accountId; for update/remove,
  // load the assignment first to find its accountId, then assert
  ```

  For `update-assignment` and `remove-assignment`, the input is `{ id }` (assignment id) — load the assignment to get `accountId` first, then `assertCanWriteAccount`. If the assignment doesn't exist, return `{ error: "Not found" }`.

- [ ] **Step 3**: Commit: `fix(account-products): require account write scope on assignment mutations`

---

## Task 4: Account-product reads

**Files:** `get-account-products.ts`.

Takes `accountId` as input. Requires `assertCanReadAccount` first; return `[]` on miss to avoid existence leak.

- [ ] **Step 1**: Test — 4 cases (401, out-of-scope → empty, in-scope user → data, manager → data).
- [ ] **Step 2**: Patch:
  ```ts
  let user;
  try { user = await requireAuthenticated(); }
  catch (e) {
    if (e instanceof AuthenticationError) return [];
    throw e;
  }
  try { await assertCanReadAccount(user, accountId); }
  catch (e) {
    if (e instanceof AuthorizationError) return [];
    throw e;
  }
  // existing query unchanged
  ```
- [ ] **Step 3**: Commit: `fix(account-products): require account read scope on get-account-products`

---

## Task 5: Invoice list by account

**File:** `actions/invoices/get-invoices-by-accountId.ts`.

Same pattern as Task 4 — gate on `assertCanReadAccount(user, accountId)`. The invoice rows themselves are filtered down further only when the user lacks access to specific invoices (B2's `canReadInvoice` already gates per-row reads, but list contexts return all rows for an account the caller can access — that's the spec's intent). Defense in depth: also filter out invoices where `createdBy !== user.id && user.role === "user"` IF the product owner wants stricter list scoping. **Default: just gate on account access** — simpler and matches the spec.

- [ ] **Step 1**: Test — 4 cases (401, out-of-scope account → empty, in-scope user → list, manager → list).
- [ ] **Step 2**: Patch (same shape as Task 4).
- [ ] **Step 3**: Commit: `fix(invoices): require account read scope on get-invoices-by-accountId`

---

## Task 6: Verification + PR

- [ ] **Step 1**: Full suite + grep for residual unscoped product/account-product reads:
  ```bash
  pnpm jest 2>&1 | tail -8
  grep -rn "prismadb\.crm_\(Products\|AccountProducts\)\." actions/ --include="*.ts" | grep -v "__tests__" | head
  ```

- [ ] **Step 2**: Manual checklist:
  - As `bob` (user), call `createProduct` → forbidden
  - As `bob`, list products → succeeds (catalog read)
  - As `bob`, `getAccountProducts(<alice-account>)` → empty (no access)
  - As `bob`, `assignProduct({ accountId: <alice-account>, ... })` → forbidden
  - As `manager`, all the above → succeed

- [ ] **Step 3**: Push + PR
  ```bash
  git push -u origin feat/authz-phase-e1
  gh pr create --base dev --head feat/authz-phase-e1 --title "fix(security): scope products + account-products + invoice list (Phase E1)"
  ```

---

## Acceptance Criteria

- All 4 product mutation actions require `manager`/`admin`; `user` calls return `{error:"Forbidden"}`.
- Both product read actions require authentication (any role).
- All 3 account-product mutation actions require account write scope.
- `get-account-products` and `get-invoices-by-accountId` require account read scope.
- New tests cover unauth/user/manager/admin per action.

## Out of E1 scope

- **E2:** campaigns + templates (separate decision-point on user can-send/schedule)
- **E3:** documents
- **E4:** projects (boards/sections/tasks)
- Per-row invoice list scoping inside an accessible account — the current pattern returns all invoices in scope-allowed accounts; further per-row filtering (e.g., user-role can only see invoices they created within their accounts) would be a follow-up tightening
- Product visibility per role (some products marked private to manager+) — feature creep
