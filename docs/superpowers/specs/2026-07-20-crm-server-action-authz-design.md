# Workstream A — Object-Level Authorization for CRM Server Actions — Design

**Date:** 2026-07-20
**Status:** Implemented 2026-07-20 (branch `security/workstream-a-crm-authz`, unpushed; pending final review)
**Advisory:** GHSA-qwhm-9fcm-p878 (critical) — "Pervasive Missing Authorization: Privilege Escalation + IDOR Across All API Endpoints"

## Implementation notes (2026-07-20)

Delivered across 12 commits: 7 write-scope helpers in `lib/authz/scopes/crm.ts`, then per-entity guards on every unguarded mutating CRM server action (accounts, contacts, leads, opportunities, contracts, both line-item modules, targets, target-lists, CRM tasks). Verification gate green: 216 suites / 1195 tests (baseline 204/1096), tsc clean, `pnpm build` succeeds.

Executed inline rather than via subagent dispatch: the Agent tool's permission classifier blocked the security-content dispatches (same pattern recorded for P2/P3/P4C), so the controller implemented and reviewed each task directly, with TDD (every scope test verified RED against pre-guard code) plus tsc/jest/build as the independent gate. A final whole-branch review is still owed.

Residual items for the final review:
- **Coverage-sweep catch:** `actions/crm/targets/convert-target.ts` was a mutating `"use server"` action (creates account+contact, updates target) called directly from `UpdateTargetForm`, missed by the plan's enumeration (the inventory mislabeled it "no mutation"). Guarded with `assertCanWriteTarget` + a scope test.
- **Cross-entity inconsistency (Minor):** relink-on-update parent-write is enforced only on `update-contact` (assigned_account), not on `update-lead`/`update-opportunity`/`update-contract` when they relink an account. Worth a uniform decision.
- **`assertCanWriteCrmTask` deviation (documented):** covers creator/assignee only; the spec also mentioned "or parent-write". Deferred as a safe narrowing (it would only widen access) to avoid an unverified relation name.
- **Line-item read guards (`get-line-items` x2):** guarded inside the `cache()` body via `requireAuthenticated`/`assertCanRead*`; the caching-vs-auth interaction is asserted correct by reasoning, not an integration test.

## Problem

The `lib/authz` migration (shipped across 0.9–0.17) added object-level scoping to projects, documents, invoices, campaigns, reports, and the CRM **API routes**. It never reached the CRM **server actions**. Those actions authorize on session-existence alone and then mutate by a client-supplied id:

```ts
const session = await getSession();
if (!session?.user?.id) return { error: "Unauthorized" };
await prismadb.crm_Accounts.update({ where: { id }, data });   // no ownership check
```

Any authenticated `role: "user"` account can therefore take over or destroy any CRM record in the deployment. The most damaging instance rewrites ownership:

```js
await updateAccount({ id: "<victim-account-uuid>", assigned_to: "<my-user-id>" })
```

which silently transfers the record and, because `assigned_to` is in the read scope, makes it legitimately the attacker's afterward. **~42 unguarded mutating server actions** span accounts, contacts, leads, opportunities, contracts, opportunity/contract line-items, targets, target-lists, and CRM tasks. (The exact count varies ±1 on judgment calls — the session-only `convert-target` wrapper, the two non-`"use server"` `get-line-items` readers — so the implementation plan pins the definitive per-file set; this spec enumerates by group.)

This is genuinely exploitable at 0.17.0. The advisory's privilege-escalation vector (changing `role`/`userStatus`) is **already fixed** — `role`/`userStatus` are `input: false` in the auth layer, and admin actions are behind `requireRole(["admin"])`. Only the IDOR/object-level half remains, and that is the entire scope of this workstream.

## Scope

**In scope:** adding object-level authorization to every unguarded mutating CRM server action, the missing `lib/authz` write-scope helpers they need, and regression tests.

**Out of scope:** the MCP project tools (separate advisory GHSA-vq6p-3qj5-p666, workstream B); SSRF (GHSA-f5r5-f2v5-74ww, workstream C); the admin ResendCard action and IMAP hardening (already fixed on `security/quick-fixes-resend-imap`); the read-scope surface (already guarded); `restore-*` actions (already admin-gated — left unchanged); email actions (already enforce per-row `userId` ownership).

## Non-goals

- No new authorization *model*. The model already exists and ships on the read side; this workstream mirrors it onto writes.
- No refactor of the read-scope helpers or the guarded actions.
- No change to role semantics.

## Architecture

### The model is already defined (and already shipped on reads)

`lib/authz/scopes/crm.ts` defines the scope every read already enforces:

- `role: "user"` — owns a record when it is `assigned_to` them or they `createdBy`/`created_by` it (exact column per model below).
- `role: "manager" | "admin"` — unrestricted.

Because **reads are already locked this way**, a `user` cannot see records they do not own. Locking writes to the same scope therefore cannot break a workflow that works today — you cannot currently edit through the UI what you cannot see. This is the compatibility guarantee: writes converge to the read scope, no new denial surface beyond what reads already impose.

### The guard pattern (replicated from `actions/crm/activities/update-activity.ts`)

The canonical guarded action is the template. Authorization runs **outside** the mutation try/catch so a denial is never swallowed into the generic failure branch:

```ts
import {
  requireAuthenticated,
  assertCanWriteAccount,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

let user;
try {
  user = await requireAuthenticated();
} catch (e) {
  if (e instanceof AuthenticationError) return { error: "Unauthorized" };
  throw e;
}
try {
  await assertCanWriteAccount(user, accountId);
} catch (e) {
  if (e instanceof AuthorizationError) return { error: "Forbidden" };
  throw e;
}
// ... existing mutation try/catch, stamping updatedBy: user.id where the column exists
```

Mapping convention (already established repo-wide): `AuthenticationError → { error: "Unauthorized" }`, `AuthorizationError → { error: "Forbidden" }`.

### Three guard shapes

1. **Record write** — update / soft-delete / watch of a record that carries ownership columns. Assert write on the record itself.
2. **Parent write** — create/link operations that attach a child to a parent (contact→account, line-item→opportunity/contract, target→target-list, CRM task→account/opportunity). **Assert write on the parent** (per the design decision below). Plain creates with no parent need only `requireAuthenticated` + ownership stamping, since the created row is owned by its creator.
3. **Parent-only ownership** — line-items carry no assignee/soft-delete column; ownership is defined entirely by the parent opportunity/contract. This is also semantically correct because a line-item write recomputes the parent's totals (the action already cascades a `crm_Opportunities`/`crm_Contracts` update).

### Design decisions

- **Parent authorization = WRITE on the parent.** Creating or linking a child requires write access to the parent, not merely read. Consistent with line-items mutating the parent, and the write scope already admits assignees, so legitimately-assigned users are not locked out.
- **Soft-delete = a write.** `delete-*` actions require record write, identical to update. `restore-*` actions remain admin-only (unchanged).
- **CRM task ownership** (`crm_Accounts_Tasks`) = creator OR assignee OR parent-write, mirroring how the Projects task model grants the assignee write. This model has no soft-delete column.

## Components

### New `lib/authz/scopes/crm.ts` helpers (foundation)

Each mirrors the existing `assertCanWriteAccount` (throws `AuthorizationError` on miss; admin/manager unrestricted). **Column names differ per model — the guard must key on the exact column, or it silently authorizes against a nonexistent field.**

| Helper | Model | Ownership columns (exact) | Soft-delete filter |
|---|---|---|---|
| `assertCanWriteLead` | `crm_Leads` | `assigned_to`, `createdBy` (camelCase) | `deletedAt: null` |
| `assertCanWriteOpportunity` | `crm_Opportunities` | `assigned_to`, `createdBy` | `deletedAt: null` |
| `assertCanWriteContract` | `crm_Contracts` | `assigned_to`, `createdBy` | `deletedAt: null` |
| `assertCanWriteTargetList` | `crm_TargetLists` | `created_by` (snake_case; **no `assigned_to`**) | `deletedAt: null` |
| `assertCanWriteCrmTask` | `crm_Accounts_Tasks` | `createdBy` **or** `user` (assignee); **no soft-delete column** | none |
| `assertCanWriteOpportunityLineItem` | `crm_OpportunityLineItems` | none — resolve parent `opportunityId`, delegate to `assertCanWriteOpportunity` | via parent |
| `assertCanWriteContractLineItem` | `crm_ContractLineItems` | none — resolve parent `contractId`, delegate to `assertCanWriteContract` | via parent |

Existing and reused unchanged: `assertCanWriteAccount`, `assertCanWriteContact`, `assertCanWriteTarget`, `requireAuthenticated`, `AuthenticationError`, `AuthorizationError`. All new helpers are re-exported from `lib/authz/index.ts`.

The two line-item wrappers resolve the parent id from the line-item row (for update/remove/reorder) or take it from the input (for create), then delegate — so they are independently unit-testable and the parent-write rule lives in one place.

### The 42 actions to guard, by group

Each action gets the guard shape noted. `updatedBy: user.id` is stamped where the column exists.

- **Accounts (6):** `create-account` (plain create), `update-account` (record write), `delete-account` (record write), `watch-account`/`unwatch-account` (record write), `create-task` (parent write on account/opportunity).
- **Contacts (4):** `create-contact` (parent write on account when `accountsIDs` set, else plain create), `update-contact` (record write; may use `tryScopedUpdateContact`), `delete-contact` (record write), `unlink-opportunity` (record write on contact **and** parent write on opportunity).
- **Leads (3):** `create-lead` (plain create), `update-lead`, `delete-lead` (record write).
- **Opportunities (3):** `create-opportunity` (parent write on account when linked, else plain create), `update-opportunity`, `delete-opportunity` (record write). Note `update-opportunity` is also the stage-transition path — the existing approval gate stays; the authz assert is added ahead of it.
- **Contracts (3):** `create-new-contract`, `update-contract`, `delete-contract` (record write; parent write on account when linked).
- **Opportunity line-items (4):** `add-line-item` (parent write via input `opportunityId`), `update-line-item`/`remove-line-item`/`reorder-line-items` (parent write via resolved parent). Also guard the non-`"use server"` reader `get-line-items` with a parent read assert.
- **Contract line-items (5):** `add-line-item`, `copy-from-opportunity` (parent write on **both** the source opportunity and destination contract), `update-line-item`, `remove-line-item`, `reorder-line-items` (parent write). Guard `get-line-items` reader too.
- **Targets (5):** `create-target` (plain create; parent write on list if linked), `update-target`, `delete-target` (record write), `import-targets` (plain create; parent write on list if linked), `convert-target-to-deal` (record write on the source target).
- **Target-lists (5):** `create-target-list` (plain create), `update-target-list`, `delete-target-list` (record write), `add-targets-to-list` (parent write on list), `remove-target-from-list` (parent write on list).
- **CRM tasks (3):** `tasks/add-comment` (write on task via `assertCanWriteCrmTask`), `tasks/assign-document` (write on task), `tasks/delete-task` (write on task). (`accounts/create-task` is counted under Accounts, not here.)

### Data flow / error handling

Unchanged from the canonical pattern: auth resolved first, assert next (both outside the mutation try/catch), mutation last. Denials return `{ error: "Forbidden" }` / `{ error: "Unauthorized" }` — the same shape the UI already handles from guarded actions. No existence oracle: a scoped assert that misses returns Forbidden regardless of whether the id exists.

## Testing

Every group has **zero** authz coverage today; each fix needs net-new tests, colocated as `<action>-scope.test.ts` (existing convention).

- **Helper unit tests** mirror `lib/authz/__tests__/scopes-crm-account.test.ts`: for each new helper, owner/assignee passes, non-owner `user` throws `AuthorizationError`, admin/manager passes, soft-deleted/missing row throws.
- **Action tests** per action: owner (and assignee where applicable) succeeds; a non-owner `user` receives `{ error: "Forbidden" }` **and the Prisma mutation is not called**; admin/manager succeeds. Parent-write actions add: linking under a parent the user cannot write is Forbidden and no child is created.
- **Every test must fail against the pre-fix code.** A test that passes with the guard removed proves nothing; this is the acceptance bar for the workstream.

## Compatibility & rollout

- No schema change, no migration.
- No new denial beyond the existing read scope (argued above), so no expected regression for legitimate users.
- Behavioral change is intentional and security-motivated: previously-succeeding cross-user writes now return Forbidden.
- The advisory stays unpublished until this lands; on completion, publish narrowed to the CRM server-action surface, crediting the reporter, and close the duplicate `GHSA-6hv5-gx63-fqrf`.

## Packaging

One implementation plan, decomposed into ~10 tasks: a **foundation task** adding the seven new helpers with unit tests, then **one task per entity group** guarding that group's actions with their scope tests. Executed via subagent-driven development with review between tasks. Sequencing within the plan: helpers first (prerequisite), then accounts → contacts → opportunities → opportunity line-items → contracts → contract line-items → leads → targets → target-lists → CRM tasks (line-item groups follow their parent-entity group, which supplies the parent-write helper).
