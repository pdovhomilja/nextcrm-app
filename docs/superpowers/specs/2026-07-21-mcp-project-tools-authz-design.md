# Workstream B — Object-Level Authorization for MCP Project Tools — Design

**Date:** 2026-07-21
**Status:** Approved (design), pending implementation
**Advisory:** GHSA-vq6p-3qj5-p666 (high) — "RBAC Bypass in MCP Project Tools Allows Shared Users to Tamper with Project Boards and Tasks"

## Problem

`lib/mcp/tools/projects.ts` exposes 18 MCP tools over the Projects module (boards, sections, tasks, comments, document links, watchers). It never imports `@/lib/authz`. Of the 18 tools, 15 are exploitable:

- **Cross-tenant, no authorization at all** — `update_section`, `delete_section`, `get_task`, `update_task`, `move_task`, `delete_task`, `add_comment`, `list_comments`, `assign_document`. These do a bare `findUnique` on an attacker-supplied id and mutate/read. Any holder of any valid MCP API token (minted from the profile UI by any registered user) can tamper with **any board's** tasks, sections, comments, and document links in the deployment — not limited to boards shared with them.
- **Share-scope → write escalation** — `update_board`, `delete_board`, `create_section` gate writes with `userBoardWhere` (a *read* predicate: owner OR `sharedWith`), so a user a board is merely shared with can rename/soft-delete it or add sections.
- **Escalation primitive** — `watch_board` is unguarded; a `boardWatchers` row places the caller inside `boardReadScopeWhere`, so an attacker can self-grant durable **read** access to any board.
- **Arbitrary board enumeration** — `list_tasks` applies its board scope only when neither `board` nor `section` is supplied; passing a board id dumps that board's tasks.

The equivalent web/server-action surface for every one of these operations is correctly guarded (via `assertCanReadBoard`/`assertCanWriteBoard`/`assertCanReadTask`/`assertCanWriteTask` and the board scope predicates). The MCP layer simply reimplemented the operations without the guards. **That asymmetry — a guarded surface and an unguarded parallel surface reaching the same data — is the vulnerability**, and it is the same class as workstream A (unguarded CRM server actions) and the campaign-tools advisory (GHSA-c9vg-c532-ppqx) already fixed in this same file family.

## Scope

**In scope:** wiring every MCP project tool in `lib/mcp/tools/projects.ts` to the existing board/task authorization, a small MCP scope-adapter, deletion of the misused `userBoardWhere`, and the first MCP-tool regression tests.

**Out of scope:** the authorization *model* and helpers (already exist and ship on the web surface); the MCP transport/auth layer (the dispatcher already resolves `mcpUser: AuthzUser` and passes it to handlers); the other MCP tool files (campaigns already fixed; CRM tools carry their own owner scoping); the duplicate advisory `GHSA-6hv5-gx63-fqrf` (close as a dup on completion).

## Non-goals

- No new authorization model or helpers. Every assert this needs already exists in `lib/authz/scopes/crm.ts` and is exported from `lib/authz`.
- No change to the MCP dispatcher or `getMcpUser`.
- No field-level whitelist for task-assignee writes (documented residual — see below).

## Architecture

### The mechanism (verified against current code)

- The dispatcher (`app/api/mcp/[transport]/route.ts`) calls `tool.handler(args, mcpUser.id, mcpUser)`. `mcpUser` is `McpUser = AuthzUser` (`{ id, role }`, role resolved from the DB in `lib/mcp/auth.ts`). Handlers currently take `(args, userId)` and ignore the third arg.
- The dispatcher maps thrown errors to MCP codes by **message string**: `"NOT_FOUND"` → `NOT_FOUND`, `"FORBIDDEN"` → `FORBIDDEN`, `"Unauthorized"` → `UNAUTHORIZED`, else `INTERNAL_ERROR`. `notFound(entity)` (`lib/mcp/helpers.ts`) throws `Error("NOT_FOUND")`.
- The board/task asserts throw `AuthorizationError` (message `"Forbidden"`, not the exact `"FORBIDDEN"` the dispatcher matches), so an un-adapted assert would surface as `INTERNAL_ERROR`.

### The scope adapter (new, `lib/mcp/helpers.ts`)

One small helper runs an assert and converts a denial into `notFound` — surfacing `NOT_FOUND` (no existence oracle: a non-owner cannot distinguish "forbidden" from "does not exist") and matching `campaigns.ts`'s existing behavior:

```ts
import { AuthorizationError } from "@/lib/authz";

// Run an object-level authorization assert; convert a denial into a NOT_FOUND
// so callers do not learn whether the id exists. Non-authorization errors propagate.
export async function assertScopeOrNotFound(
  assert: () => Promise<void>,
  entity: string,
): Promise<void> {
  try {
    await assert();
  } catch (e) {
    if (e instanceof AuthorizationError) notFound(entity); // throws Error("NOT_FOUND")
    throw e;
  }
}
```

### Enforcement model (all asserts exist; verified in `lib/authz/scopes/crm.ts`)

- `boardReadScopeWhere(user)` — admin/manager: `deletedAt:null`; user: owner OR `sharedWith` OR `visibility:"public"` OR watcher.
- `boardWriteScopeWhere(user)` — admin/manager: `deletedAt:null`; user: owner (`user:user.id`) only.
- `assertCanReadBoard` / `assertCanWriteBoard(user, boardId)` — throw `AuthorizationError` on miss.
- `assertCanReadTask` / `assertCanWriteTask(user, taskId)` — resolve the parent board via `assigned_section.board_relation`, then apply the board scope; `assertCanWriteTask` additionally allows a `role:"user"` task assignee (`task.user === user.id`).

### Per-tool guard mapping

Handlers become `async handler(args, _userId: string, user: AuthzUser)`. Stamp `user.id` where `userId` was used.

| Tool | Op | Guard |
|---|---|---|
| `projects_list_boards` | read/list | query `where: boardReadScopeWhere(user)` (replaces `userBoardWhere`; restores public/watched access) |
| `projects_get_board` | read | `findFirst({ where: { id, ...boardReadScopeWhere(user) }})` → `notFound("Board")` |
| `projects_create_board` | create | auth only (row owned by creator); stamp `user.id` |
| `projects_update_board` | write | `assertScopeOrNotFound(() => assertCanWriteBoard(user, args.id), "Board")` |
| `projects_delete_board` | write | `assertScopeOrNotFound(() => assertCanWriteBoard(user, args.id), "Board")` |
| `projects_create_section` | write parent | `assertScopeOrNotFound(() => assertCanWriteBoard(user, args.board), "Board")` |
| `projects_update_section` | write | resolve `sections.findUnique(args.id).board` → `assertCanWriteBoard(user, board)` (missing section → `notFound("Section")`) |
| `projects_delete_section` | write | resolve section→board → `assertCanWriteBoard(user, board)` |
| `projects_list_tasks` | read/list | **always** set `where.assigned_section = { board_relation: boardReadScopeWhere(user) }`, then AND the optional `board`/`section`/`user`/`status` filters into the same `where` (closes the supplied-`board`/`section` bypass) |
| `projects_get_task` | read | `assertScopeOrNotFound(() => assertCanReadTask(user, args.id), "Task")` then fetch |
| `projects_create_task` | write parent | resolve `sections.findUnique(args.section).board` → `assertCanWriteBoard(user, board)` (missing section → `notFound("Section")`) |
| `projects_update_task` | write | `assertScopeOrNotFound(() => assertCanWriteTask(user, args.id), "Task")` |
| `projects_move_task` | write both | `assertCanWriteTask(user, args.id)` (source) **and** resolve `sections.findUnique(args.section).board` → `assertCanWriteBoard(user, board)` (destination); both via the adapter |
| `projects_delete_task` | write | `assertScopeOrNotFound(() => assertCanWriteTask(user, args.id), "Task")` |
| `projects_add_comment` | write task | `assertScopeOrNotFound(() => assertCanWriteTask(user, args.task), "Task")` |
| `projects_list_comments` | read task | `assertScopeOrNotFound(() => assertCanReadTask(user, args.task), "Task")` then list |
| `projects_assign_document` | write task + read doc | `assertCanWriteTask(user, args.task_id)` **and** `assertCanReadDocument(user, args.document_id)`, both via the adapter |
| `projects_watch_board` | read | `assertScopeOrNotFound(() => assertCanReadBoard(user, args.board_id), "Board")` |

**`watch_board` is a read gate, deliberately.** Board `watchers` sit only in `boardReadScopeWhere`, not the write scope, so watching a board the caller can already read grants nothing new; the only risk is self-granting read to a board they cannot see, which a read gate prevents. (This differs from workstream A's account-watch, a *write* gate, because account watchers are inside the account *write* OR-clause.)

**Delete `userBoardWhere`** (lines 13–21) after `list_boards`/`get_board` move to `boardReadScopeWhere`, so the misused read-as-write predicate cannot be reused.

## Data flow / error handling

Each single-record write/read runs its assert first (through the adapter, so a denial → `NOT_FOUND`), then performs the operation. Lists apply the board read scope in the query `where` so out-of-scope rows are never returned. `create_board` needs no assert — the row is owned by its creator. Existing `conflict`/`notFound` behavior for empty-section-delete and missing rows is preserved.

## Testing

No MCP tool test exists today; this workstream introduces the first harness under `lib/mcp/__tests__/`. A tool is invoked by locating it in `projectTools` by `name` and calling its `handler(args, user.id, user)` with `@/lib/prisma` and `@/lib/authz` mocked.

- **Adapter unit test:** `assertScopeOrNotFound` converts a thrown `AuthorizationError` into `Error("NOT_FOUND")` and lets a passing assert through and non-auth errors propagate.
- **Per-tool tests:** for each guarded tool — a caller the assert rejects (mock the relevant `assertCan*` to throw `AuthorizationError`) gets `NOT_FOUND` **and the Prisma mutation is not called**; an authorized caller performs the operation with the expected id; the assert is invoked with the right id/parent. Dual-guard tools (`move_task`, `assign_document`) assert that a rejection from **either** side blocks the operation. `list_tasks` asserts the board read scope is always present in the query `where`.
- **Every test must fail against the pre-fix code** — the acceptance bar.

## Compatibility & rollout

- No schema change, no migration, no dispatcher change.
- `list_boards`/`get_board` become *more* permissive in one correct direction (public + watched boards now visible, which `userBoardWhere` wrongly hid) and correctly scoped in the dangerous direction.
- Behavioral change is intentional and security-motivated: previously-succeeding cross-tenant and share-scope writes now return `NOT_FOUND`.
- The advisory stays unpublished until this lands; on completion, publish and close the duplicate `GHSA-6hv5-gx63-fqrf`.

## Residual items (for the final review, not this scope)

- **Task-assignee write breadth:** `assertCanWriteTask` allows a `role:"user"` assignee full write (the helper defers field-whitelisting to the caller). This matches the web surface, but means a non-owner assignee can edit a task's title/content via `update_task`, not only its status. A field whitelist for the assignee-bypass path is a separate, cross-surface refinement.
- **`create_board` visibility:** any authenticated user may create a board with `visibility:"public"`; unchanged by this work, noted for completeness.

## Packaging

One implementation plan: a foundation task (the `assertScopeOrNotFound` adapter + its unit test + the first MCP test harness), then one task per tool-group — boards, sections, tasks, comments+documents, watch (with `list_tasks` folded into tasks) — each guarding its tools with per-tool tests, then a verification task (full suite, tsc, build, coverage sweep confirming no `projects_*` handler still lacks an assert, and deletion of `userBoardWhere`). Executed via subagent-driven development where possible; inline fallback if the Agent classifier blocks the security content (as it did in workstream A).
