# Permission-Driven Authorization — Phase E4 (Projects: Boards + Sections + Tasks) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Add role + ownership scoping to the projects subsystem (boards, sections, tasks, comments, document assignments). After E4, a `user` only sees boards they own, are shared with, watch, or that are public; sections/tasks inherit their parent board's scope. Manager/admin: bare reads. Send/email side-effects respect existing patterns.

**Architecture:**
1. New helpers: `boardReadScopeWhere(user)`, `boardWriteScopeWhere(user)`, `assertCanReadBoard`, `assertCanWriteBoard`, `assertCanReadTask` (resolves through task→section→board), `assertCanWriteTask` (board write OR task assignee).
2. Reads on boards/sections/tasks → role-scoped.
3. Mutations on board/section → require board write scope.
4. Task mutations → require board write scope OR (assignee for status-only changes per spec §6.12 special rule).
5. Watch/unwatch operations require board read scope (you can watch any board you can see).
6. Document-to-task assignment requires both `assertCanWriteTask` AND `assertCanReadDocument` (E3 helper).

**Spec source:** §6.12 (Projects), §8.14, §12 Phase 5.
**Audit source:** Implicit — boards/tasks weren't on the original audit, but spec §6.12 details the scope rules.

**Depends on:** D-phase + E3 (for `assertCanReadDocument` used in `assignDocumentToTask`). If E3 not yet merged, the document-link task can fall back to `requireAuthenticated` only and TODO the document scope.

---

## File Structure

**New tests:** ~16 (one per action) under `actions/projects/__tests__/`, plus helper tests in `lib/authz/__tests__/`.

**Modified:**
- `lib/authz/scopes/crm.ts` — new board/task helpers
- `lib/authz/index.ts`
- `actions/projects/*.ts` — all 16 files

---

## Task 1: Board + task scope helpers

**Files:**
- Modify: `lib/authz/scopes/crm.ts`
- Create: `lib/authz/__tests__/scopes-projects.test.ts`

```ts
// Board read: owner OR shared OR watcher OR visibility=public.
// Note: confirm `Boards.visibility` enum (likely "public"|"private") and `sharedWith` shape.
export function boardReadScopeWhere(user: AuthzUser) {
  if (user.role === "admin" || user.role === "manager") {
    return { deletedAt: null };
  }
  return {
    deletedAt: null,
    OR: [
      { user: user.id },                                  // owner
      { sharedWith: { has: user.id } },                   // sharedWith is uuid[]
      { visibility: "public" },                            // public board
      { watchers: { some: { user_id: user.id } } },        // watcher junction
    ],
  };
}

// Board write: owner OR manager/admin (not watchers, not sharedWith for writes).
export function boardWriteScopeWhere(user: AuthzUser) {
  if (user.role === "admin" || user.role === "manager") {
    return { deletedAt: null };
  }
  return { deletedAt: null, user: user.id };
}

export async function assertCanReadBoard(user: AuthzUser, boardId: string) {
  const row = await prismadb.boards.findFirst({
    where: { id: boardId, ...boardReadScopeWhere(user) },
    select: { id: true },
  });
  if (!row) throw new AuthorizationError();
}

export async function assertCanWriteBoard(user: AuthzUser, boardId: string) {
  const row = await prismadb.boards.findFirst({
    where: { id: boardId, ...boardWriteScopeWhere(user) },
    select: { id: true },
  });
  if (!row) throw new AuthorizationError();
}

// Task read: parent board read access.
export async function assertCanReadTask(user: AuthzUser, taskId: string) {
  const task = await prismadb.tasks.findUnique({
    where: { id: taskId },
    select: { assigned_section: { select: { board_relation: { select: { id: true } } } } },
  });
  if (!task?.assigned_section?.board_relation?.id) throw new AuthorizationError();
  return assertCanReadBoard(user, task.assigned_section.board_relation.id);
}

// Task write: parent board write OR (user is task assignee — for status-only changes).
// The plan exposes a strict version (board write) and the action layer can use a softer
// check for status-only changes if needed (mark-task-done, kanban position).
export async function assertCanWriteTask(user: AuthzUser, taskId: string) {
  const task = await prismadb.tasks.findUnique({
    where: { id: taskId },
    select: {
      user: true,
      assigned_section: { select: { board_relation: { select: { id: true } } } },
    },
  });
  if (!task?.assigned_section?.board_relation?.id) throw new AuthorizationError();
  // Manager/admin always pass via boardWriteScopeWhere.
  // User: must be board owner OR task assignee.
  if (user.role === "user" && task.user === user.id) return;
  return assertCanWriteBoard(user, task.assigned_section.board_relation.id);
}
```

**Confirm during implementation:**
- Schema name `boards` vs `Boards` (lowercase per Prisma typically; explore showed `Boards`).
- `sharedWith` Prisma type — `String[]` with `has` operator, OR scalar list with `hasSome`.
- Watcher junction model name (likely `BoardWatchers` per spec §6.12).
- `visibility` enum exact value for public.

- [ ] Test (admin/manager/user shapes for both helpers + assert paths), implement, barrel, commit:
```bash
git commit -m "feat(authz): add board and task read/write scope helpers"
```

---

## Task 2: Project read actions

**Files (~10):** `get-boards.ts`, `get-board.ts`, `get-board-sections.ts`, `get-sections.ts`, `get-kanban-data.ts`, `get-task.ts`, `get-task-comments.ts`, `get-task-documents.ts`, `get-tasks.ts`, `get-tasks-past-due.ts`, `get-user-tasks.ts`.

Apply pattern per file:
- `get-boards.ts` — spread `boardReadScopeWhere(user)`. The existing query already filters by `user OR sharedWith OR public OR watcher` — REPLACE the manual OR with the helper to avoid drift.
- `get-board.ts` — `assertCanReadBoard` → existing detail query.
- `get-board-sections.ts` / `get-sections.ts` — `assertCanReadBoard(user, boardId)` first → existing list (sections are 1:n with board, no separate scope).
- `get-kanban-data.ts` — `assertCanReadBoard` → existing query (board + sections + tasks).
- `get-task.ts` — `assertCanReadTask`.
- `get-task-comments.ts` / `get-task-documents.ts` — `assertCanReadTask` first.
- `get-tasks.ts` — if it takes `boardId`, gate via `assertCanReadBoard`. If it lists tasks across boards, scope by joining through board scope (use `assigned_section.board_relation: boardReadScopeWhere(user)` in nested where).
- `get-tasks-past-due.ts`, `get-user-tasks.ts` — for `user` role, restrict to own tasks (`user: user.id`); manager/admin: bare. The "past-due" report likely should remain global for managers.

- [ ] One test per file (4 cases each), patch, commit:
```bash
git commit -m "fix(projects): scope project read actions by board access"
```

---

## Task 3: Board mutations

**Files:** `create-project.ts`, `update-project.ts`, `delete-project.ts`, `watch-project.ts`, `unwatch-project.ts`.

- `create-project.ts` — `requireAuthenticated`; existing logic creates board with `user = user.id`. No further scope needed (anyone can create their own board).
- `update-project.ts` / `delete-project.ts` — `assertCanWriteBoard`.
- `watch-project.ts` / `unwatch-project.ts` — `assertCanReadBoard` (you can watch boards you can see).

- [ ] Tests + patches + commit:
```bash
git commit -m "fix(projects): require board write/read scope on board mutations"
```

---

## Task 4: Section mutations

**Files:** `create-section.ts`, `update-section-title.ts`, `delete-section.ts`.

All require `assertCanWriteBoard(user, boardId)` on the parent board. For update/delete, load the section to find its `board` FK first.

- [ ] Tests + patches + commit:
```bash
git commit -m "fix(projects): require parent board write scope on section mutations"
```

---

## Task 5: Task mutations

**Files:** `create-task.ts`, `create-task-in-board.ts`, `update-task.ts`, `delete-task.ts`, `mark-task-done.ts`, `update-kanban-position.ts`, `add-comment-to-task.ts`, `assign-document-to-task.ts`.

Two tiers:
- **Strict (board write required):** `create-task`, `create-task-in-board`, `update-task` (full edit), `delete-task`, `add-comment-to-task` (comments are content), `assign-document-to-task`.
- **Soft (assignee allowed):** `mark-task-done`, `update-kanban-position` — these are status-only changes a user assigned to the task should be able to make. Use the soft `assertCanWriteTask` (which permits assignee).

For `assign-document-to-task`:
- `assertCanWriteTask(user, taskId)`
- AND `assertCanReadDocument(user, documentId)` if E3 is merged (otherwise `requireAuthenticated` and TODO).

For `create-task` / `create-task-in-board`:
- `assertCanWriteBoard(user, boardId)`. Existing email-on-assignment-to-different-user logic stays.

- [ ] Tests + patches + commit (split into 2 commits if it gets noisy: "task strict mutations" + "task soft mutations"):
```bash
git commit -m "fix(projects): require board/task scope on task mutations"
```

---

## Task 6: Verification + PR

- [ ] Full suite + grep for residual unscoped board/task reads:
  ```bash
  grep -rn "prismadb\.\(boards\|tasks\|sections\)\.\(findMany\|findFirst\|findUnique\)" actions/projects/ --include="*.ts" | grep -v "__tests__\|scopes/crm" | head
  ```

- [ ] Manual checklist:
  - As `bob`, list boards → own + shared + public + watched
  - As `bob`, navigate to private board owned by `alice` → 404
  - As `bob`, `updateProject(<alice-private-board>)` → forbidden
  - As `bob` (assignee on `alice`'s task): `markTaskDone` succeeds, `updateTask` (full edit) → forbidden
  - As `manager`, all the above → succeed

- [ ] Push + PR:
  ```bash
  gh pr create --base dev --head feat/authz-phase-e4 --title "fix(security): scope projects (boards/sections/tasks) (Phase E4)"
  ```

---

## Acceptance Criteria

- Boards reads/writes apply owner/sharedWith/watcher/visibility/role rules.
- Sections inherit board scope (no independent ownership).
- Task reads require parent board read; writes require board write OR assignee for status-only changes.
- Watch/unwatch require board read access.
- `assign-document-to-task` requires both task write and document read.
- New tests cover unauth/user/manager/admin per action; helper tests cover role permutations.

## Out of E4 scope

- **Phase F**: cleanup (`is_admin`/`is_account_admin` removal, Prisma enum)
- Section reordering across boards — current logic stays
- Public-board listing UX — out of authz concern
- Per-task visibility tags — feature creep
- Project-level user-management (sharedWith add/remove) is not currently in `actions/projects/` — handled separately

---

## Phase E summary (across E1 + E2 + E3 + E4)

After all four PRs merge:
- Products (catalog reads any-role; mutations manager/admin only) — E1
- Account-product assignments use account write scope — E1
- Invoice list-by-account uses account read scope — E1
- Campaigns + templates: creator-or-privileged scope; send/schedule manager/admin only — E2
- Documents: ownership + visibility + linked-entity scope on reads, ownership on writes, fail-closed on bulk — E3
- Projects: board owner/shared/watcher/public scope; task scope inherits board, soft-write for assignees — E4

Total Phase E: ~52 actions hardened, ~12 new helpers in `lib/authz/scopes/crm.ts`, ~50 new tests.

After Phase E, only **Phase F (cleanup)** remains: remove `Users.is_admin` / `is_account_admin` columns, switch `Users.role` to a Prisma enum, remove dual `created_by`/`createdBy` field redundancy where safe.
