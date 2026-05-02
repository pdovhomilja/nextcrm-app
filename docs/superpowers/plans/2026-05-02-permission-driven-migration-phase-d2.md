# Permission-Driven Authorization — Phase D2 (Leads, Contacts, Opportunities, Contracts) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Add user/manager/admin scoping to every list/detail/search read action across the four big CRM entities — leads, contacts, opportunities, contracts. Each entity gets a `xxxReadScopeWhere(user)` helper that follows the spec §6 ownership rules including **linked-account scope** (the Phase B1 TODO is closed here): a user can read a lead/contact/opportunity/contract if they own the linked account, even if the row itself isn't directly assigned to them.

**Architecture:** Extend `lib/authz/scopes/crm.ts` with four new exported helpers built on top of D1's `accountUserScopeOR`. Apply them to ~12 read action files. Detail queries get a corresponding `assertCanReadXxx` helper following the contact/target/account pattern. Where shapes use Prisma's nested relation filter syntax (`{ assigned_accounts: { OR: [...] } }`) so the entire query is a single round trip.

**Spec source:** §6.2 (leads), §6.3 (contacts), §6.4 (opportunities), §6.5 (contracts), §8.2–8.5, §12 Phase 4.
**Audit source:** "Global CRM Read Actions".

**Depends on:** Phase D1 merged (`accountUserScopeOR`, `accountReadScopeWhere`).

---

## File Structure

**New tests** (one per helper + per action file):
- `lib/authz/__tests__/scopes-crm-entity-read.test.ts` — covers all 4 new helpers
- `actions/crm/{leads,contacts,opportunities,contracts}/__tests__/{file-name}-scope.test.ts` — one per modified action

**Modified:**
- `lib/authz/scopes/crm.ts` — add `leadReadScopeWhere`, `contactReadScopeWhere`, `opportunityReadScopeWhere`, `contractReadScopeWhere`, `assertCanReadLead`, `assertCanReadOpportunity`, `assertCanReadContract` (note: `assertCanReadContact` already exists from B1)
- `lib/authz/index.ts`
- `actions/crm/get-leads.ts`, `actions/crm/get-lead.ts`, `actions/crm/get-leads-by-accountId.ts`
- `actions/crm/get-contacts.ts`, `actions/crm/get-contact.ts`, `actions/crm/get-contacts-by-accountId.ts`, `actions/crm/get-contacts-by-opportunityId.ts`
- `actions/crm/get-opportunities.ts`, `actions/crm/get-opportunities-with-includes.ts`, `actions/crm/get-opportunity.ts`
- `actions/crm/get-contract.ts`, `actions/crm/get-contracts.ts`

**Note on file paths:** Phase A audit said `actions/crm/leads/get-leads.ts` but the D-plans inventory shows files live at `actions/crm/get-*.ts` (flat). Implementer should `grep -rn "export async function get(Lead|Contact|Opportunity|Contract)"` first to confirm exact paths. The plan steps below assume the inventoried paths.

---

## Helper design (all four entities follow this shape)

```ts
// Lead — links to account via leads.accountsIDs (FK)
export function leadReadScopeWhere(user: AuthzUser) {
  if (user.role === "admin" || user.role === "manager") {
    return { deletedAt: null };
  }
  return {
    deletedAt: null,
    OR: [
      { assigned_to: user.id },
      { createdBy: user.id },
      { assigned_accounts: { OR: accountUserScopeOR(user.id) } },
    ],
  };
}

// Contact — relation: assigned_accounts via accountsIDs FK; legacy fields included
export function contactReadScopeWhere(user: AuthzUser) {
  if (user.role === "admin" || user.role === "manager") {
    return { deletedAt: null };
  }
  return {
    deletedAt: null,
    OR: [
      { assigned_to: user.id },
      { created_by: user.id },
      { createdBy: user.id },
      { assigned_accounts: { OR: accountUserScopeOR(user.id) } },
    ],
  };
}

// Opportunity — relation: assigned_account via account FK
// Use the actual relation name in the model (confirm via Prisma schema)
export function opportunityReadScopeWhere(user: AuthzUser) {
  if (user.role === "admin" || user.role === "manager") {
    return { deletedAt: null };
  }
  return {
    deletedAt: null,
    OR: [
      { assigned_to: user.id },
      { created_by: user.id },
      { createdBy: user.id },
      { assigned_account: { OR: accountUserScopeOR(user.id) } },
    ],
  };
}

// Contract — same as opportunity but only assigned_to + createdBy (no created_by) + linked account
export function contractReadScopeWhere(user: AuthzUser) {
  if (user.role === "admin" || user.role === "manager") {
    return { deletedAt: null };
  }
  return {
    deletedAt: null,
    OR: [
      { assigned_to: user.id },
      { createdBy: user.id },
      { assigned_account: { OR: accountUserScopeOR(user.id) } },
    ],
  };
}
```

`assertCanReadLead`, `assertCanReadOpportunity`, `assertCanReadContract` follow the pattern of `assertCanReadAccount`: `findFirst({ where: { id, ...xxxReadScopeWhere(user) }, select: { id: true } })` → throw `AuthorizationError` if null.

For `assertCanReadContact` (already shipped in B1), this phase **upgrades** the helper body to add the linked-account branch — make the change in `lib/authz/scopes/crm.ts` and update the existing `scopes-crm-read.test.ts` to cover the new branch.

---

## Task 1: Entity scope helpers

**Files:**
- Modify: `lib/authz/scopes/crm.ts` — add 4 `xxxReadScopeWhere` + 3 new `assertCanReadXxx` (`assertCanReadContact` body upgrade)
- Create: `lib/authz/__tests__/scopes-crm-entity-read.test.ts`
- Modify: `lib/authz/__tests__/scopes-crm-read.test.ts` — add coverage for new contact linked-account branch
- Modify: `lib/authz/index.ts` — re-export

- [ ] **Step 1: Failing test** for the 4 helpers + the 3 new asserts. Use the same shape as Phase D1 Task 1: each helper test has admin/manager/user cases and asserts the exact `OR` array structure.

For the linked-account upgrade to `assertCanReadContact`, the test asserts that for `user` role, the where clause includes both the direct ownership OR (existing) and the new `{ assigned_accounts: { OR: [...] } }` clause.

- [ ] **Step 2: Implement helpers per the design block above.**

Inside `assertCanReadXxx`, use the appropriate model (`crm_Leads`, `crm_Opportunities`, `crm_Contracts`). For `assertCanReadContact` upgrade, the body becomes:
```ts
const row = await prismadb.crm_Contacts.findFirst({
  where: { id: contactId, ...contactReadScopeWhere(user) },
  select: { id: true },
});
if (!row) throw new AuthorizationError();
```
This replaces the previous direct-only ownership check. **Run the existing T1 test from B1 to confirm it still passes** — the new branch is additive (more rows match, not fewer for the user the row already belonged to).

- [ ] **Step 3: Add to barrel**

```ts
export {
  leadReadScopeWhere,
  contactReadScopeWhere,
  opportunityReadScopeWhere,
  contractReadScopeWhere,
  assertCanReadLead,
  assertCanReadOpportunity,
  assertCanReadContract,
} from "./scopes/crm";
```

- [ ] **Step 4: Test → PASS, commit**

```bash
git add lib/authz/scopes/crm.ts lib/authz/__tests__/ lib/authz/index.ts
git commit -m "feat(authz): add lead/contact/opportunity/contract read-scope helpers (linked-account aware)"
```

---

## Task 2: Patch lead read actions

**Files:**
- Modify: `actions/crm/get-leads.ts`, `actions/crm/get-lead.ts`, `actions/crm/get-leads-by-accountId.ts`
- Create: `__tests__/` files for each (follow pattern from D1 Task 2/3/4)

For each:
- `get-leads.ts` — list pattern: `requireAuthenticated` → spread `leadReadScopeWhere(user)` into existing where → existing query runs
- `get-lead.ts` — detail pattern: `requireAuthenticated` → `assertCanReadLead(user, leadId)` (throws on miss → return null/error per existing contract) → existing detail query
- `get-leads-by-accountId.ts` — list-by-account pattern: `requireAuthenticated` → `assertCanReadAccount(user, accountId)` to verify access to the parent account first → then list scoped by both `accountsIDs: accountId` AND `leadReadScopeWhere(user)` (defense in depth: a user with parent-account access still sees only leads they can see directly)

Tests: 4 cases per file (401, user out-of-scope, user in-scope, manager).

- [ ] **Step 1–3 per file** (test → patch → commit)

```bash
git add actions/crm/get-leads.ts actions/crm/get-lead.ts actions/crm/get-leads-by-accountId.ts actions/crm/__tests__/
git commit -m "fix(crm): scope lead reads by role and linked-account access"
```

---

## Task 3: Patch contact read actions

**Files:**
- Modify: `actions/crm/get-contacts.ts`, `actions/crm/get-contact.ts`, `actions/crm/get-contacts-by-accountId.ts`, `actions/crm/get-contacts-by-opportunityId.ts`

Same pattern as Task 2:
- `get-contacts.ts` — list with `contactReadScopeWhere`
- `get-contact.ts` — detail with `assertCanReadContact` (uses upgraded helper from Task 1)
- `get-contacts-by-accountId.ts` — `assertCanReadAccount` first, then list scoped
- `get-contacts-by-opportunityId.ts` — `assertCanReadOpportunity` first, then list with `contactReadScopeWhere(user)` AND the existing `opportunities: { some: { opportunity_id: opportunityId } }` filter

```bash
git add actions/crm/get-contact*.ts actions/crm/__tests__/
git commit -m "fix(crm): scope contact reads by role and linked-account/opportunity access"
```

---

## Task 4: Patch opportunity read actions

**Files:**
- Modify: `actions/crm/get-opportunities.ts`, `actions/crm/get-opportunities-with-includes.ts`, `actions/crm/get-opportunity.ts`

Same pattern: list functions spread `opportunityReadScopeWhere(user)` into where; detail uses `assertCanReadOpportunity`. The cached variant `get-opportunities-with-includes.ts` may use Next.js `unstable_cache` — the cache key MUST include `user.id` (or `user.role` if managers/admins all share global cache, but user IDs each get their own slot). Otherwise one user's cached result leaks to another. Pattern:

```ts
export async function getOpportunitiesWithIncludes() {
  const user = await requireAuthenticated();
  const cached = unstable_cache(
    async () => prismadb.crm_Opportunities.findMany({
      where: opportunityReadScopeWhere(user),
      // ... existing select / include
    }),
    ["opportunities-with-includes", user.role === "user" ? user.id : "global"],
    { /* existing tags / revalidate */ },
  );
  return cached();
}
```

- [ ] Implement + tests + commit:

```bash
git add actions/crm/get-opportunities*.ts actions/crm/get-opportunity.ts actions/crm/__tests__/
git commit -m "fix(crm): scope opportunity reads by role; cache key respects user scope"
```

---

## Task 5: Patch contract read actions

**Files:**
- Modify: `actions/crm/get-contract.ts`, `actions/crm/get-contracts.ts`

`get-contracts.ts` overloads on argument: list-all OR list-by-account. Both branches use `contractReadScopeWhere(user)`; the by-account branch additionally `assertCanReadAccount` first.

```bash
git add actions/crm/get-contract.ts actions/crm/get-contracts.ts actions/crm/__tests__/
git commit -m "fix(crm): scope contract reads by role and linked-account access"
```

---

## Task 6: Verification + PR

- [ ] **Step 1: Full suite + cross-cutting grep**

```bash
pnpm jest 2>&1 | tail -8
grep -rn "prismadb\.crm_\(Leads\|Contacts\|Opportunities\|Contracts\)\.\(findMany\|findUnique\|findFirst\)" actions/ app/api/ --include="*.ts" | grep -v "__tests__\|scopes/crm" | head
```
Confirm no remaining unscoped reads in user-facing paths. Calls in `actions/crm/{leads,contacts,opportunities,contracts}/{create,update,delete,restore}-*.ts` are write actions (already use scope helpers in earlier phases) and don't apply.

- [ ] **Step 2: Manual cross-user attack checklist** (against deployed dev):
  - As `bob`, list endpoints / pages → only `bob`'s rows
  - As `bob`, navigate directly to `/crm/leads/<alice-lead-id>` → 404 / not found
  - As `bob`, view an account `bob` has watcher access to → linked leads/contacts/opportunities show up (linked-account scope works)
  - As `manager`, list endpoints → all rows
  - As `admin`, restore endpoints still work

- [ ] **Step 3: Push + PR**

```bash
git push -u origin feat/authz-phase-d2
gh pr create --base dev --head feat/authz-phase-d2 --title "fix(security): scope CRM lead/contact/opportunity/contract reads by role (Phase D2)" --body "..."
```

PR body references: spec §6.2–6.5, this plan, the linked-account scope closure of B1's TODO.

---

## Acceptance Criteria

- Every list/detail/search read action across leads, contacts, opportunities, contracts requires authentication and applies a role-aware where filter.
- `assertCanReadContact` body now includes linked-account scope (B1 TODO closed).
- The `getOpportunitiesWithIncludes` cache key includes user identity for `user`-role callers.
- New tests cover unauth/user/manager/admin per action; helper tests cover role permutations.

## Out of D2 scope

- Targets, target lists, activities, audit logs, similarity — **D3**
- Restore actions (admin-only — keep current admin guards untouched)
- Write actions (already gated in earlier phases)
- Removing the dual `created_by`/`createdBy` columns — Phase F
