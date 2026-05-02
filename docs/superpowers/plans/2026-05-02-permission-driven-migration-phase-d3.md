# Permission-Driven Authorization — Phase D3 (Targets, Lists, Activities, Audit, Similarity) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Close the remaining CRM read-side scope gaps from the audit. After D3, target/list lookups, entity-keyed activity feeds, audit logs, and pgvector similarity searches all enforce role-based scope. This phase finishes the spec §6 / §8 read-side migration.

**Architecture:** Five distinct sub-shapes, each with its own helper:

1. **Targets + lists** — single-creator scope. Adds `targetReadScopeWhere`, `targetListReadScopeWhere`, `assertCanReadTargetList`.
2. **Activities-by-entity** — heterogeneous: resolve to the linked entity's scope. New `assertCanReadActivityForEntity(user, entityType, entityId)` dispatches to existing `assertCanRead*` helpers based on `entityType`.
3. **Audit-log-by-entity** — same dispatch as activities.
4. **Audit-log-admin** — already admin-gated; just normalize to canonical `requireRole(["admin"])`.
5. **Similarity (pgvector raw SQL)** — post-filter the SQL result set through `filterAuthorized*Ids` so out-of-scope candidates are dropped before being returned.

**Spec source:** §6.8 (targets), §8.7, §8.8, §8.10, §12 Phase 4.
**Audit source:** "Global CRM Read Actions" residuals.

**Depends on:** D1 + D2 merged. Reuses `assertCanReadAccount`, `assertCanReadLead`, `assertCanReadContact`, `assertCanReadOpportunity`, `assertCanReadContract`, `assertCanReadTarget` (B1), `filterAuthorizedContactIds`, `filterAuthorizedTargetIds` (B1).

---

## File Structure

**New tests:**
- `lib/authz/__tests__/scopes-crm-target-read.test.ts`
- `lib/authz/__tests__/scopes-crm-activity-dispatch.test.ts`
- `actions/crm/__tests__/get-target*-scope.test.ts`
- `actions/crm/activities/__tests__/get-activities-by-entity-scope.test.ts`
- `actions/crm/audit-log/__tests__/get-audit-log-by-entity-scope.test.ts`
- `actions/crm/similarity/__tests__/scope.test.ts`

**Modified:**
- `lib/authz/scopes/crm.ts` — add `targetReadScopeWhere`, `targetListReadScopeWhere`, `assertCanReadTargetList`, `assertCanReadActivityForEntity`
- `lib/authz/index.ts`
- `actions/crm/get-target.ts`, `get-targets.ts`, `get-target-list.ts`, `get-target-lists.ts`
- `actions/crm/activities/get-activities-by-entity.ts`
- `actions/crm/audit-log/get-audit-log-by-entity.ts`
- `actions/crm/audit-log/get-audit-log-admin.ts` — normalize admin guard
- `actions/crm/similarity/get-similar-{accounts,contacts,leads,opportunities}.ts`

---

## Task 1: Target + target-list scope helpers

```ts
// crm_Targets has no deletedAt and no assigned_to — only created_by.
export function targetReadScopeWhere(user: AuthzUser) {
  if (user.role === "admin" || user.role === "manager") return {};
  return { created_by: user.id };
}

// crm_TargetLists has deletedAt + created_by.
export function targetListReadScopeWhere(user: AuthzUser) {
  if (user.role === "admin" || user.role === "manager") {
    return { deletedAt: null };
  }
  return { deletedAt: null, created_by: user.id };
}

export async function assertCanReadTargetList(user: AuthzUser, listId: string) {
  const row = await prismadb.crm_TargetLists.findFirst({
    where: { id: listId, ...targetListReadScopeWhere(user) },
    select: { id: true },
  });
  if (!row) throw new AuthorizationError();
}
```

`assertCanReadTarget` already exists from B1; no change.

- [ ] **Step 1: Failing test** at `lib/authz/__tests__/scopes-crm-target-read.test.ts` covering admin/manager/user shapes for both helpers + `assertCanReadTargetList` (404 case + 200 case).

- [ ] **Step 2: Implement, add to barrel, test → PASS, commit**

```bash
git commit -m "feat(authz): add target and target-list read-scope helpers"
```

---

## Task 2: Patch target read actions

**Files:**
- Modify: `actions/crm/get-target.ts`, `get-targets.ts`, `get-target-list.ts`, `get-target-lists.ts`

Apply patterns from D1/D2:
- `get-target.ts` — `requireAuthenticated` + `assertCanReadTarget` (existing) → existing detail query
- `get-targets.ts` — `requireAuthenticated` + spread `targetReadScopeWhere(user)` into where
- `get-target-list.ts` — `requireAuthenticated` + `assertCanReadTargetList`
- `get-target-lists.ts` — `requireAuthenticated` + spread `targetListReadScopeWhere(user)`

- [ ] One test file per action (same shape as D1 — 401, user-out, user-in, manager).

- [ ] Commit:

```bash
git commit -m "fix(crm): scope target and target-list reads by role"
```

---

## Task 3: Activity / audit dispatch helper

**Files:**
- Modify: `lib/authz/scopes/crm.ts` — add `assertCanReadActivityForEntity`
- Create: `lib/authz/__tests__/scopes-crm-activity-dispatch.test.ts`

```ts
type ScopedEntityType =
  | "account" | "lead" | "contact" | "opportunity" | "contract" | "target" | "target_list";

export async function assertCanReadActivityForEntity(
  user: AuthzUser,
  entityType: string,
  entityId: string,
): Promise<void> {
  switch (entityType.toLowerCase()) {
    case "account":     return assertCanReadAccount(user, entityId);
    case "lead":        return assertCanReadLead(user, entityId);
    case "contact":     return assertCanReadContact(user, entityId);
    case "opportunity": return assertCanReadOpportunity(user, entityId);
    case "contract":    return assertCanReadContract(user, entityId);
    case "target":      return assertCanReadTarget(user, entityId);
    case "target_list":
    case "targetlist":  return assertCanReadTargetList(user, entityId);
    default:
      // Unknown entity types: managers/admins can see; users cannot.
      if (user.role === "user") throw new AuthorizationError();
      return;
  }
}
```

- [ ] **Step 1: Failing test** — one case per entity type plus the unknown-type fallback.

Mock all 7 individual `assertCanRead*` helpers via `jest.spyOn` or `jest.mock("../scopes/crm")` partial mock. For each entity type, assert the correct helper is called with the correct args.

- [ ] **Step 2: Implement, barrel, test → PASS, commit**

```bash
git commit -m "feat(authz): add activity-for-entity scope dispatch helper"
```

---

## Task 4: Patch `getActivitiesByEntity`

**Files:**
- Modify: `actions/crm/activities/get-activities-by-entity.ts`
- Create test

Current behavior: paginated activities for a given `entityType + entityId` with no auth. Fix: `requireAuthenticated` → `assertCanReadActivityForEntity(user, entityType, entityId)` (returns 404/empty on miss) → existing query.

- [ ] **Step 1: Failing test**:
  - 401 unauth → no DB query
  - 404 (or empty page) when user can't read the entity
  - 200 with activities when user can read the entity (manager+ for any entity, user for their own)
  - Mock `@/lib/auth-server`, `@/lib/prisma`, AND the dispatch helper itself (`jest.mock("@/lib/authz")` partial — keep `requireAuthenticated`, mock `assertCanReadActivityForEntity` to throw or resolve depending on case).

- [ ] **Step 2: Patch action**, ensure existing pagination cursor logic is unchanged.

- [ ] **Commit:**

```bash
git commit -m "fix(crm): require entity-scoped read access on activity feed"
```

---

## Task 5: Patch `getAuditLogByEntity` + normalize `getAuditLogAdmin`

**Files:**
- Modify: `actions/crm/audit-log/get-audit-log-by-entity.ts` — same pattern as Task 4 using `assertCanReadActivityForEntity` (audit logs share the same entity model)
- Modify: `actions/crm/audit-log/get-audit-log-admin.ts` — replace existing `session.user.role !== "admin"` check with canonical `requireRole(["admin"])` (matches Phase C pattern)

- [ ] Test + patch each:
  - `get-audit-log-by-entity.ts` — 4 cases (401, user-not-in-scope, user-in-scope, manager)
  - `get-audit-log-admin.ts` — 3 cases (401, user → forbidden, admin → success)

- [ ] **Commit:**

```bash
git commit -m "fix(crm): scope audit-log-by-entity and normalize audit-log-admin to canonical helper"
```

---

## Task 6: Filter pgvector similarity results

**Files:**
- Modify: `actions/crm/similarity/get-similar-accounts.ts`
- Modify: `actions/crm/similarity/get-similar-contacts.ts`
- Modify: `actions/crm/similarity/get-similar-leads.ts`
- Modify: `actions/crm/similarity/get-similar-opportunities.ts`

These use raw SQL to query pgvector. We can't easily inject a Prisma `where` into the raw query, but we **can** post-filter results: take the SQL result set, then call `filterAuthorizedXxxIds(user, candidateIds)` and return only matches.

Pattern (each file):

```ts
import {
  requireAuthenticated,
  assertCanReadAccount, // or appropriate per file
  filterAuthorizedContactIds, // or relevant filter
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export async function getSimilarContacts(recordId: string, limit = 10) {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return [];
    throw e;
  }

  // Step 1: ensure user can read the BASE record. Without this, info disclosure
  // happens via "we ran the query" timing.
  try {
    await assertCanReadContact(user, recordId);
  } catch (e) {
    if (e instanceof AuthorizationError) return [];
    throw e;
  }

  // Step 2: existing raw SQL — fetches up to `limit * 3` candidates so post-filter
  // still returns useful results for user-role callers with narrower scope.
  const candidates: Array<{ id: string; /* + similarity fields */ }> =
    await prismadb.$queryRaw`
      ... existing pgvector query, but ORDER BY distance LIMIT ${limit * 3} ...
    `;

  // Step 3: post-filter
  const ids = candidates.map((c) => c.id);
  const allowed = new Set(await filterAuthorizedContactIds(user, ids));
  const filtered = candidates.filter((c) => allowed.has(c.id)).slice(0, limit);
  return filtered;
}
```

For `getSimilarAccounts`, you'd need an `filterAuthorizedAccountIds` helper — add it to `lib/authz/scopes/crm.ts` (mirroring `filterAuthorizedContactIds`) using `accountReadScopeWhere`.

For `getSimilarLeads` and `getSimilarOpportunities`, add `filterAuthorizedLeadIds` and `filterAuthorizedOpportunityIds` similarly — small utility additions reusing the read-scope helpers.

- [ ] **Step 1: Add the three new filter helpers** (`Account`, `Lead`, `Opportunity`) — small extension to `lib/authz/scopes/crm.ts`. One unit test per helper.

- [ ] **Step 2–5: Patch each similarity action** (one task subset per file). Test cases per file:
  - 401 unauth → empty result
  - 404/empty when user can't read the base record
  - results filtered correctly for user role
  - manager/admin gets unfiltered results

- [ ] **Commit:**

```bash
git commit -m "fix(crm): scope pgvector similarity results by user/manager/admin"
```

---

## Task 7: Verification + PR

- [ ] **Step 1: Full suite + grep for residual unscoped reads on the affected models**

```bash
pnpm jest 2>&1 | tail -8
grep -rn "prismadb\.crm_\(Targets\|TargetLists\|Activities\|AuditLog\)\." actions/ app/api/ --include="*.ts" | grep -v "__tests__\|scopes/crm" | head
```

- [ ] **Step 2: Manual checklist (dev)**:
  - As `bob`, list targets → only `bob`'s
  - As `bob`, view activity feed for `alice`'s opportunity → 404/empty
  - As `bob`, similarity search on a contact `bob` cannot read → empty
  - As `bob`, similarity search on `bob`'s contact → returns only contacts `bob` can read
  - As `manager`, all the above → full results

- [ ] **Step 3: Push + PR**

```bash
git push -u origin feat/authz-phase-d3
gh pr create --base dev --head feat/authz-phase-d3 --title "fix(security): scope targets, activities, audit log, similarity (Phase D3)" --body "..."
```

PR body references: spec §6.8/§8.7/§8.8/§8.10, this plan, residual-scope items going to Phase E (products, campaigns, documents, projects).

---

## Acceptance Criteria

- Every list/detail target read action requires auth + role-scoped filter.
- `getActivitiesByEntity` and `getAuditLogByEntity` resolve scope through the entity dispatcher and reject out-of-scope readers.
- `getAuditLogAdmin` uses canonical `requireRole(["admin"])`.
- All four similarity actions verify access to the base record AND post-filter result sets through scope.
- New filter helpers (`filterAuthorizedAccountIds`, `filterAuthorizedLeadIds`, `filterAuthorizedOpportunityIds`) exist alongside the B1 contact/target ones.

## Out of D3 scope

- **Phase E** picks up: products, campaigns + templates, documents, projects (boards/tasks), full invoice list-scoping.
- **Phase F** removes `is_admin` / `is_account_admin` columns and switches `Users.role` to a Prisma enum.
- Removing dual `created_by`/`createdBy` columns is a separate cleanup (Phase F).

---

## Phase D summary (across D1 + D2 + D3)

After all three PRs merge, the residual audit gaps for CRM core (accounts/leads/contacts/opportunities/contracts/targets/activities/audit/similarity) are closed. Total ~25 read action files patched; ~10 new helpers added to `lib/authz/scopes/crm.ts`. The `Users.role` is now consulted for every CRM read operation.
