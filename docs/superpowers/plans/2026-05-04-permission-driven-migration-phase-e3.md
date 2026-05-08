# Permission-Driven Authorization — Phase E3 (Documents) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Close the document-action audit findings: global document listing, no ownership checks on delete/bulk operations, no account-write check on linking. Apply role + visibility-based scope across reads, plus per-document ownership on writes and bulk filter on multi-id operations.

**Architecture:** Documents have multi-faceted ownership (`created_by_user`, `assigned_user`, `visibility` enum, plus link junctions to accounts/leads/contacts/opportunities/tasks). The user-scope rule is: a user can read a document if they created it OR are assigned to it OR a linked entity is in their scope. Manager/admin: bare read. Phase E3 implements:

1. New `documentReadScopeWhere(user)` that captures the full ownership matrix.
2. New `assertCanReadDocument`, `assertCanWriteDocument`, `filterAuthorizedDocumentIds` helpers.
3. Patch all 12 document actions (reads + writes + bulk).

**Visibility model decision:** The existing `Documents.visibility` field is enforced as: user-role users see public docs OR docs they directly own/are assigned to OR docs linked to in-scope entities. Manager/admin: see all. Plan applies the most conservative interpretation — `visibility = "public"` is the only sharing mechanism that overrides ownership; the field's exact enum values should be confirmed during T1 implementation.

**Spec source:** §6.10 (Documents), §8.12, §12 Phase 5.
**Audit source:** "Medium-High: Global Document Listing".

**Depends on:** D-phase merged (account/lead/contact/opportunity scope helpers).

---

## File Structure

**New tests:** ~12 (one per modified action) under `actions/documents/__tests__/`, plus one helper test in `lib/authz/__tests__/`.

**Modified:**
- `lib/authz/scopes/crm.ts` — new `documentReadScopeWhere`, asserts, filter
- `lib/authz/index.ts`
- `actions/documents/*.ts` — all 12 files

---

## Task 1: Document scope helpers

**Files:**
- Modify: `lib/authz/scopes/crm.ts` (despite the name, this is the central authz module — keeps everything in one place)
- Create: `lib/authz/__tests__/scopes-crm-document-read.test.ts`

```ts
// User scope: created OR assigned OR linked entity in scope OR public visibility.
// "public" assumed; confirm the enum value during implementation.
export function documentReadScopeWhere(user: AuthzUser) {
  if (user.role === "admin" || user.role === "manager") {
    return { deletedAt: null };
  }
  return {
    deletedAt: null,
    OR: [
      { created_by_user: user.id },
      { createdBy: user.id }, // legacy duplicate
      { assigned_user: user.id },
      { visibility: "public" },
      // Linked-entity scope (any of the junction tables resolves to an entity in user scope).
      // Only the most common are included; expand if other junctions matter:
      { accounts: { some: { account: { OR: accountUserScopeOR(user.id) } } } },
      { leads:    { some: { lead: { OR: [{ assigned_to: user.id }, { createdBy: user.id }] } } } },
      { contacts: { some: { contact: { OR: [
        { assigned_to: user.id }, { created_by: user.id }, { createdBy: user.id }
      ] } } } },
      { opportunities: { some: { opportunity: { OR: [
        { assigned_to: user.id }, { created_by: user.id }, { createdBy: user.id }
      ] } } } },
    ],
  };
}

export async function assertCanReadDocument(user: AuthzUser, documentId: string) {
  const row = await prismadb.documents.findFirst({
    where: { id: documentId, ...documentReadScopeWhere(user) },
    select: { id: true },
  });
  if (!row) throw new AuthorizationError();
}

export async function assertCanWriteDocument(user: AuthzUser, documentId: string) {
  // Write scope: same as read for now; Phase F may diverge.
  return assertCanReadDocument(user, documentId);
}

export async function filterAuthorizedDocumentIds(
  user: AuthzUser,
  documentIds: string[],
): Promise<string[]> {
  if (documentIds.length === 0) return [];
  const rows = await prismadb.documents.findMany({
    where: { id: { in: documentIds }, ...documentReadScopeWhere(user) },
    select: { id: true },
  });
  return rows.map((r: { id: string }) => r.id);
}
```

**Confirm during implementation:**
- Exact Prisma model name: `Documents` vs `documents` (the schema may use lowercase plural).
- Junction relation names (`accounts`, `leads`, `contacts`, `opportunities`) and inner relation field names (`account`, `lead`, etc.).
- `visibility` enum value for "public" — likely `Document_Visibility.PUBLIC` or similar.

- [ ] Test → implement → barrel → commit:
```bash
git commit -m "feat(authz): add document read/write scope helpers (linked-entity aware)"
```

---

## Task 2: Document read actions

**Files:** `get-documents.ts`, `search-documents.ts`, `get-document-versions.ts`, `check-duplicate.ts`.

- `get-documents.ts` — list root documents. Spread `documentReadScopeWhere(user)` into existing where (currently `parent_document_id: null`).
- `search-documents.ts` — keyword + vector. Same pattern. Vector search uses raw SQL — apply post-filter with `filterAuthorizedDocumentIds`.
- `get-document-versions.ts` — fetch versions. Versions inherit parent permissions: assert read on parent first, then list versions.
- `check-duplicate.ts` — likely checks if a hash matches existing docs. Apply scope so users don't enumerate other people's documents via duplicate check.

- [ ] Test files (4 cases per file: 401, out-of-scope-empty, in-scope, manager).
- [ ] Patch, commit: `fix(documents): scope document reads by role and linked-entity access`

---

## Task 3: Document mutations (single-doc)

**Files:** `create-document.ts`, `delete-document.ts`, `unlink-from-account.ts`, `retry-enrichment.ts`, `create-document-version.ts`.

- `create-document.ts` — `requireAuthenticated`. If `accountId` provided, `assertCanWriteAccount(user, accountId)` before creating. `createdBy = user.id, assigned_user = user.id`.
- `delete-document.ts` — `requireAuthenticated` + `assertCanWriteDocument` → existing hard delete + MinIO cleanup.
- `unlink-from-account.ts` — `assertCanWriteDocument(user, document_id)` AND `assertCanWriteAccount(user, account_id)` (need both endpoints of the link).
- `retry-enrichment.ts` — `assertCanWriteDocument`.
- `create-document-version.ts` — `assertCanWriteDocument` on parent.

- [ ] Tests + patches + single combined commit:
```bash
git commit -m "fix(documents): require ownership/account scope on document mutations"
```

---

## Task 4: Bulk document operations

**Files:** `bulk-delete-documents.ts`, `bulk-link-to-account.ts`, `bulk-change-type.ts`.

Fail-closed pattern (per B1 bulk-enrichment precedent):

- `bulk-delete-documents.ts` — call `filterAuthorizedDocumentIds(user, documentIds)`. If any id missing from the result, return 403 (or `{error: "Forbidden"}`). Otherwise proceed with bulk delete.
- `bulk-link-to-account.ts` — `assertCanWriteAccount(user, account_id)` AND `filterAuthorizedDocumentIds(user, document_ids)` length-check.
- `bulk-change-type.ts` — `filterAuthorizedDocumentIds` length-check.

- [ ] Tests + patches + commit:
```bash
git commit -m "fix(documents): filter bulk document operations by user scope (fail-closed)"
```

---

## Task 5: Verification + PR

- [ ] Full suite + grep for residual unscoped document reads:
  ```bash
  grep -rn "prismadb\.documents\." actions/ --include="*.ts" | grep -v "__tests__\|scopes/crm" | head
  ```

- [ ] Manual checklist:
  - As `bob`, list documents → only `bob`'s + linked-entity-accessible docs
  - As `bob`, `deleteDocument(<alice-doc-id>)` → forbidden
  - As `bob`, `bulkDeleteDocuments([alice, bob])` → 403, no deletion (fail-closed)
  - As `bob`, `bulkLinkToAccount({account: <alice-account>, ...})` → forbidden
  - As `manager`, all the above → succeed

- [ ] Push + PR:
  ```bash
  gh pr create --base dev --head feat/authz-phase-e3 --title "fix(security): scope documents + bulk ops (Phase E3)"
  ```

---

## Acceptance Criteria

- All document read actions apply role-aware scope (creator/assigned/visibility/linked-entity).
- All single-doc mutations require write scope on the document.
- Account-link/unlink mutations require write scope on BOTH endpoints.
- All 3 bulk operations fail-closed on any unauthorized id.
- New tests cover unauth/user/manager/admin per action.

## Out of E3 scope

- **E4**: projects (boards/sections/tasks) and assign-document-to-task (handled in E4)
- Document versions tree pagination — keep current behavior, only add the parent-read assertion
- The exact visibility enum semantics for non-`public` values — Phase F could add per-role visibility rules
- Tag-based access control — feature creep
