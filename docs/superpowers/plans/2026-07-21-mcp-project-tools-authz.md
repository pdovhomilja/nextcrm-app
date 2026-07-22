# MCP Project Tools Authorization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire every MCP project tool in `lib/mcp/tools/projects.ts` to the existing board/task authorization asserts so an API-token holder can only read/write boards and tasks they are authorized for, closing GHSA-vq6p-3qj5-p666.

**Architecture:** Each handler gains the `user: AuthzUser` third argument the dispatcher already passes, and calls the same `assertCan{Read,Write}{Board,Task}` helpers the web surface uses. A new `assertScopeOrNotFound` adapter converts a denial into the codebase's `notFound()` (surfacing `NOT_FOUND`, no existence oracle). Lists filter by `boardReadScopeWhere`. The misused `userBoardWhere` read-predicate is deleted.

**Tech Stack:** Next.js MCP handlers (`mcp-handler`), Prisma 7, `lib/authz` (existing), jest 30.

Spec: `docs/superpowers/specs/2026-07-21-mcp-project-tools-authz-design.md`

## Global Constraints

- **No new authorization model or helpers.** Every assert already exists in `lib/authz/scopes/crm.ts` and is exported from `@/lib/authz`: `assertCanReadBoard`, `assertCanWriteBoard`, `assertCanReadTask`, `assertCanWriteTask`, `assertCanReadDocument`, `boardReadScopeWhere`, `boardWriteScopeWhere`.
- **Denial surfaces as `NOT_FOUND`, not `FORBIDDEN`.** The board/task asserts throw `AuthorizationError` (message `"Forbidden"`), which the dispatcher does NOT map — so every single-record assert runs through `assertScopeOrNotFound(...)`, which converts `AuthorizationError` into `notFound(entity)` (`throw new Error("NOT_FOUND")`). This matches `campaigns.ts` and avoids leaking existence.
- **Handler signature:** every handler becomes `async handler(args, _userId: string, user: AuthzUser)`. The dispatcher (`app/api/mcp/[transport]/route.ts`) already calls `tool.handler(args, mcpUser.id, mcpUser)` where `mcpUser: AuthzUser = { id, role }`. Stamp `user.id` wherever `userId` was used.
- **`watch_board` is a READ gate** (`assertCanReadBoard`): board watchers sit only in `boardReadScopeWhere`, so watching cannot grant write; the only risk is self-granting read, which a read gate prevents.
- **Delete `userBoardWhere`** (`projects.ts:13-21`) once its last use (in `list_tasks`, Task 4) is migrated — a read predicate used as a write gate, which also wrongly omits public/watched boards.
- Run jest via `./node_modules/.bin/jest <path>` (NEVER `pnpm test` — `ERR_PNPM_IGNORED_BUILDS`). Finish each task with `pnpm exec tsc --noEmit` clean.
- **Every regression test must FAIL against the pre-fix code** — the acceptance bar.
- Conventional commits, one per task. Work on `security/workstream-b-mcp-authz` (forked from `dev`; independent of workstream A).
- Add only the imports a task actually uses (TS reports unused imports), so no task leaves an unused import.

### Test harness (apply verbatim in each tool-group test)

No MCP tool test exists yet. A tool is invoked by locating it in `projectTools` by `name` and calling its `handler`. Mock `@/lib/prisma` and `@/lib/authz`. Standard header:

```ts
jest.mock("@/lib/authz", () => ({
  // include the asserts the tools under test call:
  assertCanReadBoard: jest.fn(),
  assertCanWriteBoard: jest.fn(),
  assertCanReadTask: jest.fn(),
  assertCanWriteTask: jest.fn(),
  assertCanReadDocument: jest.fn(),
  boardReadScopeWhere: jest.fn(() => ({ deletedAt: null, __scope: "read" })),
  AuthorizationError: class AuthorizationError extends Error {},
}));
jest.mock("@/lib/prisma", () => ({ prismadb: { /* the models the tools touch */ } }));

import { projectTools } from "@/lib/mcp/tools/projects";

const USER = { id: "u1", role: "user" } as const;
// invoke a tool by name with (args, userId, user)
function call(name: string, args: any) {
  const tool = projectTools.find((t) => t.name === name)!;
  return (tool.handler as any)(args, USER.id, USER);
}
```

Load-bearing assertions per guarded tool: a caller the assert rejects (mock the relevant `assertCan*` to `mockRejectedValue(new AuthorizationError())`) causes the call to reject with `Error("NOT_FOUND")` **and the Prisma mutation is not called**; an authorized caller (assert resolves) performs the operation and the assert was called with the right id.

---

### Task 1: Foundation — `assertScopeOrNotFound` adapter

**Files:**
- Modify: `lib/mcp/helpers.ts` (add the adapter)
- Test: `lib/mcp/__tests__/scope-adapter.test.ts` (new — first MCP test file)

**Interfaces:**
- Produces: `assertScopeOrNotFound(assert: () => Promise<void>, entity: string): Promise<void>` — runs `assert`; on `AuthorizationError` calls `notFound(entity)` (throws `Error("NOT_FOUND")`); other errors propagate. Consumed by Tasks 2–6.

- [ ] **Step 1: Write the failing test**

Create `lib/mcp/__tests__/scope-adapter.test.ts`:

```ts
import { assertScopeOrNotFound } from "../helpers";
import { AuthorizationError } from "@/lib/authz";

describe("assertScopeOrNotFound", () => {
  it("converts an AuthorizationError into a NOT_FOUND error", async () => {
    await expect(
      assertScopeOrNotFound(async () => {
        throw new AuthorizationError();
      }, "Board")
    ).rejects.toThrow("NOT_FOUND");
  });

  it("passes through when the assert resolves", async () => {
    await expect(
      assertScopeOrNotFound(async () => {}, "Board")
    ).resolves.toBeUndefined();
  });

  it("propagates non-authorization errors unchanged", async () => {
    await expect(
      assertScopeOrNotFound(async () => {
        throw new Error("db down");
      }, "Board")
    ).rejects.toThrow("db down");
  });
});
```

- [ ] **Step 2: RED** — `./node_modules/.bin/jest lib/mcp/__tests__/scope-adapter.test.ts` fails: `assertScopeOrNotFound` is not exported.

- [ ] **Step 3: Implement in `lib/mcp/helpers.ts`**

At the top of the file, add the import:

```ts
import { AuthorizationError } from "@/lib/authz";
```

After the error helpers (after `externalError`), add:

```ts
// Run an object-level authorization assert (assertCanWriteBoard, etc.) and
// convert a denial into NOT_FOUND so the caller cannot tell whether the id
// exists (no existence oracle). Non-authorization errors propagate unchanged.
export async function assertScopeOrNotFound(
  assert: () => Promise<void>,
  entity: string,
): Promise<void> {
  try {
    await assert();
  } catch (e) {
    if (e instanceof AuthorizationError) notFound(entity);
    throw e;
  }
}
```

- [ ] **Step 4: GREEN** — same jest command, 3/3 pass. `pnpm exec tsc --noEmit` clean.

- [ ] **Step 5: Commit**

```bash
git add lib/mcp/helpers.ts lib/mcp/__tests__/scope-adapter.test.ts
git commit -m "feat(mcp): assertScopeOrNotFound adapter for object-level tool authorization"
```

---

### Task 2: Guard Board tools

**Files:**
- Modify: `lib/mcp/tools/projects.ts` (imports; `list_boards`, `get_board`, `create_board`, `update_board`, `delete_board`)
- Test: `lib/mcp/__tests__/projects-boards-scope.test.ts` (new)

**Interfaces:**
- Consumes: `assertScopeOrNotFound` (Task 1); `assertCanWriteBoard`, `boardReadScopeWhere`, `AuthzUser` from `@/lib/authz`.

- [ ] **Step 1: Write the failing tests**

Create `lib/mcp/__tests__/projects-boards-scope.test.ts` using the harness. Mock prismadb with `boards: { findMany, count, findFirst, create, update }`. Cases:

```ts
it("update_board: denies a non-owner (NOT_FOUND) and does not update", async () => {
  (assertCanWriteBoard as jest.Mock).mockRejectedValue(new AuthorizationError());
  await expect(call("projects_update_board", { id: "b-victim", title: "x" })).rejects.toThrow("NOT_FOUND");
  expect(assertCanWriteBoard).toHaveBeenCalledWith(USER, "b-victim");
  expect(prismadb.boards.update).not.toHaveBeenCalled();
});

it("update_board: updates for an owner", async () => {
  (assertCanWriteBoard as jest.Mock).mockResolvedValue(undefined);
  (prismadb.boards.update as jest.Mock).mockResolvedValue({ id: "b-1" });
  await call("projects_update_board", { id: "b-1", title: "x" });
  expect(prismadb.boards.update).toHaveBeenCalled();
});

it("delete_board: denies a non-owner and does not soft-delete", async () => {
  (assertCanWriteBoard as jest.Mock).mockRejectedValue(new AuthorizationError());
  await expect(call("projects_delete_board", { id: "b-victim" })).rejects.toThrow("NOT_FOUND");
  expect(prismadb.boards.update).not.toHaveBeenCalled();
});

it("list_boards: filters by boardReadScopeWhere", async () => {
  (prismadb.boards.findMany as jest.Mock).mockResolvedValue([]);
  (prismadb.boards.count as jest.Mock).mockResolvedValue(0);
  await call("projects_list_boards", { limit: 20, offset: 0 });
  const arg = (prismadb.boards.findMany as jest.Mock).mock.calls[0][0];
  expect(arg.where).toMatchObject({ __scope: "read" }); // boardReadScopeWhere(user) mock marker
});

it("get_board: scopes the findFirst by boardReadScopeWhere", async () => {
  (prismadb.boards.findFirst as jest.Mock).mockResolvedValue({ id: "b-1" });
  await call("projects_get_board", { id: "b-1" });
  const arg = (prismadb.boards.findFirst as jest.Mock).mock.calls[0][0];
  expect(arg.where).toMatchObject({ id: "b-1", __scope: "read" });
});

it("create_board: stamps the caller as owner", async () => {
  (prismadb.boards.create as jest.Mock).mockResolvedValue({ id: "b-new" });
  await call("projects_create_board", { title: "T", description: "D" });
  const data = (prismadb.boards.create as jest.Mock).mock.calls[0][0].data;
  expect(data.user).toBe("u1");
  expect(data.createdBy).toBe("u1");
});
```

- [ ] **Step 2: RED** — the deny tests fail (no guard; update runs), the scope tests fail (`userBoardWhere` marker, not `__scope`).

- [ ] **Step 3: Add imports to `projects.ts`**

Add after the existing `import ... from "../helpers"` block:

```ts
import type { AuthzUser } from "@/lib/authz";
import { assertCanWriteBoard, boardReadScopeWhere } from "@/lib/authz";
import { assertScopeOrNotFound } from "../helpers";
```

(Add `assertScopeOrNotFound` to the existing `../helpers` import instead of a second import line if you prefer; either is fine.)

- [ ] **Step 4: Rewrite the five board handlers**

`projects_list_boards` handler:
```ts
    async handler(args: { limit: number; offset: number }, _userId: string, user: AuthzUser) {
      const where = boardReadScopeWhere(user);
      const [data, total] = await Promise.all([
        prismadb.boards.findMany({
          where,
          ...paginationArgs(args),
          orderBy: { createdAt: "desc" },
          include: { _count: { select: { sections: true } } },
        }),
        prismadb.boards.count({ where }),
      ]);
      return listResponse(data, total, args.offset);
    },
```

`projects_get_board` handler:
```ts
    async handler(args: { id: string }, _userId: string, user: AuthzUser) {
      const board = await prismadb.boards.findFirst({
        where: { id: args.id, ...boardReadScopeWhere(user) },
        include: {
          sections: {
            orderBy: { position: "asc" },
            include: {
              tasks: { orderBy: { position: "asc" }, where: { taskStatus: { not: "COMPLETE" } } },
            },
          },
          watchers: true,
        },
      });
      if (!board) notFound("Board");
      return itemResponse(board);
    },
```

`projects_create_board` handler — change `userId` param to `_userId`, add `user: AuthzUser`, and stamp `user.id`:
```ts
    async handler(
      args: { title: string; description: string; icon?: string; visibility?: string },
      _userId: string,
      user: AuthzUser
    ) {
      const board = await prismadb.boards.create({
        data: {
          v: 0,
          title: args.title,
          description: args.description,
          icon: args.icon,
          visibility: args.visibility,
          user: user.id,
          createdBy: user.id,
          updatedBy: user.id,
        },
      });
      return itemResponse(board);
    },
```

`projects_update_board` handler — replace the `userBoardWhere` existence check with the write assert:
```ts
    async handler(args: Record<string, any>, _userId: string, user: AuthzUser) {
      await assertScopeOrNotFound(() => assertCanWriteBoard(user, args.id), "Board");
      const { id, ...updateData } = args;
      const board = await prismadb.boards.update({
        where: { id },
        data: { ...updateData, updatedBy: user.id },
      });
      return itemResponse(board);
    },
```

`projects_delete_board` handler:
```ts
    async handler(args: { id: string }, _userId: string, user: AuthzUser) {
      await assertScopeOrNotFound(() => assertCanWriteBoard(user, args.id), "Board");
      const board = await prismadb.boards.update({
        where: { id: args.id },
        data: softDeleteData(user.id),
      });
      return itemResponse({ id: board.id, deletedAt: board.deletedAt });
    },
```

- [ ] **Step 5: GREEN + typecheck** — the board test file passes; `pnpm exec tsc --noEmit` clean. (Note: `userBoardWhere` is still used by `create_section` and `list_tasks`, so it is NOT yet unused — do not delete it here.)

- [ ] **Step 6: Commit**

```bash
git add lib/mcp/tools/projects.ts lib/mcp/__tests__/projects-boards-scope.test.ts
git commit -m "feat(mcp): object-level authorization on project board tools"
```

---

### Task 3: Guard Section tools

**Files:**
- Modify: `lib/mcp/tools/projects.ts` (`create_section`, `update_section`, `delete_section`)
- Test: `lib/mcp/__tests__/projects-sections-scope.test.ts` (new)

**Interfaces:**
- Consumes: `assertScopeOrNotFound`, `assertCanWriteBoard` (already imported in Task 2).

- [ ] **Step 1: Write the failing tests** — mock prismadb `sections: { findUnique, aggregate, create, update, delete }`, `boards: { findFirst }`. Cases:

```ts
it("create_section: denies when the parent board is not writable", async () => {
  (assertCanWriteBoard as jest.Mock).mockRejectedValue(new AuthorizationError());
  await expect(call("projects_create_section", { board: "b-victim", title: "S" })).rejects.toThrow("NOT_FOUND");
  expect(assertCanWriteBoard).toHaveBeenCalledWith(USER, "b-victim");
  expect(prismadb.sections.create).not.toHaveBeenCalled();
});

it("update_section: resolves parent board then requires write; denies otherwise", async () => {
  (prismadb.sections.findUnique as jest.Mock).mockResolvedValue({ id: "s-1", board: "b-1" });
  (assertCanWriteBoard as jest.Mock).mockRejectedValue(new AuthorizationError());
  await expect(call("projects_update_section", { id: "s-1", title: "x" })).rejects.toThrow("NOT_FOUND");
  expect(assertCanWriteBoard).toHaveBeenCalledWith(USER, "b-1");
  expect(prismadb.sections.update).not.toHaveBeenCalled();
});

it("update_section: NOT_FOUND when the section does not exist", async () => {
  (prismadb.sections.findUnique as jest.Mock).mockResolvedValue(null);
  await expect(call("projects_update_section", { id: "missing" })).rejects.toThrow("NOT_FOUND");
});

it("delete_section: resolves parent board then requires write", async () => {
  (prismadb.sections.findUnique as jest.Mock).mockResolvedValue({ id: "s-1", board: "b-1", _count: { tasks: 0 } });
  (assertCanWriteBoard as jest.Mock).mockRejectedValue(new AuthorizationError());
  await expect(call("projects_delete_section", { id: "s-1" })).rejects.toThrow("NOT_FOUND");
  expect(prismadb.sections.delete).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: RED.**

- [ ] **Step 3: Rewrite the three section handlers**

`projects_create_section` — replace the `userBoardWhere` board lookup with the write assert (keep the `maxPos` + create):
```ts
    async handler(args: { board: string; title: string }, _userId: string, user: AuthzUser) {
      await assertScopeOrNotFound(() => assertCanWriteBoard(user, args.board), "Board");
      const maxPos = await prismadb.sections.aggregate({
        where: { board: args.board },
        _max: { position: true },
      });
      const section = await prismadb.sections.create({
        data: {
          v: 0,
          board: args.board,
          title: args.title,
          position: (maxPos._max.position ?? BigInt(0)) + BigInt(1000),
        },
      });
      return itemResponse(section);
    },
```

`projects_update_section` — resolve the parent board from the existing section, then require write:
```ts
    async handler(args: { id: string; title?: string; position?: number }, _userId: string, user: AuthzUser) {
      const existing = await prismadb.sections.findUnique({ where: { id: args.id } });
      if (!existing) notFound("Section");
      await assertScopeOrNotFound(() => assertCanWriteBoard(user, existing.board), "Board");
      const { id, position, ...rest } = args;
      const section = await prismadb.sections.update({
        where: { id },
        data: { ...rest, ...(position !== undefined && { position: BigInt(position) }) },
      });
      return itemResponse(section);
    },
```

`projects_delete_section` — require write on the parent board before the empty-check/delete:
```ts
    async handler(args: { id: string }, _userId: string, user: AuthzUser) {
      const section = await prismadb.sections.findUnique({
        where: { id: args.id },
        include: { _count: { select: { tasks: true } } },
      });
      if (!section) notFound("Section");
      await assertScopeOrNotFound(() => assertCanWriteBoard(user, section.board), "Board");
      if (section._count.tasks > 0) conflict("Cannot delete section with tasks. Move or delete tasks first.");
      await prismadb.sections.delete({ where: { id: args.id } });
      return itemResponse({ id: args.id, deleted: true });
    },
```

- [ ] **Step 4: GREEN + typecheck.**
- [ ] **Step 5: Commit** — `git add lib/mcp/tools/projects.ts lib/mcp/__tests__/projects-sections-scope.test.ts && git commit -m "feat(mcp): object-level authorization on project section tools"`

---

### Task 4: Guard Task tools + delete `userBoardWhere`

**Files:**
- Modify: `lib/mcp/tools/projects.ts` (`list_tasks`, `get_task`, `create_task`, `update_task`, `move_task`, `delete_task`; delete `userBoardWhere`)
- Test: `lib/mcp/__tests__/projects-tasks-scope.test.ts` (new)

**Interfaces:**
- Consumes: `assertScopeOrNotFound`, `assertCanWriteBoard` (imported); adds `assertCanReadTask`, `assertCanWriteTask`.

- [ ] **Step 1: Write the failing tests** — mock prismadb `tasks: { findMany, count, findUnique, create, update }`, `sections: { findUnique, aggregate }`. Cases:

```ts
it("update_task: denies a non-authorized caller and does not update", async () => {
  (assertCanWriteTask as jest.Mock).mockRejectedValue(new AuthorizationError());
  await expect(call("projects_update_task", { id: "t-victim", title: "x" })).rejects.toThrow("NOT_FOUND");
  expect(assertCanWriteTask).toHaveBeenCalledWith(USER, "t-victim");
  expect(prismadb.tasks.update).not.toHaveBeenCalled();
});

it("delete_task: denies and does not update status", async () => {
  (assertCanWriteTask as jest.Mock).mockRejectedValue(new AuthorizationError());
  await expect(call("projects_delete_task", { id: "t-victim" })).rejects.toThrow("NOT_FOUND");
  expect(prismadb.tasks.update).not.toHaveBeenCalled();
});

it("get_task: denies read and does not fetch the task body", async () => {
  (assertCanReadTask as jest.Mock).mockRejectedValue(new AuthorizationError());
  await expect(call("projects_get_task", { id: "t-victim" })).rejects.toThrow("NOT_FOUND");
});

it("create_task: requires write on the parent board (via the section)", async () => {
  (prismadb.sections.findUnique as jest.Mock).mockResolvedValue({ id: "s-1", board: "b-1" });
  (assertCanWriteBoard as jest.Mock).mockRejectedValue(new AuthorizationError());
  await expect(call("projects_create_task", { title: "T", section: "s-1", priority: "Normal" })).rejects.toThrow("NOT_FOUND");
  expect(assertCanWriteBoard).toHaveBeenCalledWith(USER, "b-1");
  expect(prismadb.tasks.create).not.toHaveBeenCalled();
});

it("move_task: requires write on BOTH the source task and the destination board", async () => {
  (assertCanWriteTask as jest.Mock).mockResolvedValue(undefined); // source ok
  (prismadb.sections.findUnique as jest.Mock).mockResolvedValue({ id: "s-dest", board: "b-dest" });
  (assertCanWriteBoard as jest.Mock).mockRejectedValue(new AuthorizationError()); // dest denied
  await expect(call("projects_move_task", { id: "t-1", section: "s-dest" })).rejects.toThrow("NOT_FOUND");
  expect(assertCanWriteTask).toHaveBeenCalledWith(USER, "t-1");
  expect(assertCanWriteBoard).toHaveBeenCalledWith(USER, "b-dest");
  expect(prismadb.tasks.update).not.toHaveBeenCalled();
});

it("list_tasks: always constrains to boards the user can read, even when a board id is supplied", async () => {
  (prismadb.tasks.findMany as jest.Mock).mockResolvedValue([]);
  (prismadb.tasks.count as jest.Mock).mockResolvedValue(0);
  await call("projects_list_tasks", { board: "b-any", limit: 20, offset: 0 });
  const where = (prismadb.tasks.findMany as jest.Mock).mock.calls[0][0].where;
  // the board read scope is always applied to the parent board relation
  expect(where.assigned_section.board_relation).toMatchObject({ __scope: "read" });
  // and the requested board id is ANDed in
  expect(where.assigned_section.board).toBe("b-any");
});
```

- [ ] **Step 2: RED.**

- [ ] **Step 3: Add the task imports** — extend the `@/lib/authz` import in `projects.ts` to add `assertCanReadTask, assertCanWriteTask`.

- [ ] **Step 4: Rewrite `list_tasks`** — always scope by the parent board's read scope, then AND the optional filters:

```ts
    async handler(
      args: { board?: string; section?: string; user?: string; status?: string; limit: number; offset: number },
      _userId: string,
      user: AuthzUser
    ) {
      const where: any = {
        ...(args.section && { section: args.section }),
        ...(args.user && { user: args.user }),
        ...(args.status && { taskStatus: args.status as any }),
        // Always constrain to tasks whose parent board the caller can read, and
        // AND any requested board on top. This is the fix: a supplied board id
        // can no longer bypass scoping (previously it did).
        assigned_section: {
          board_relation: boardReadScopeWhere(user),
          ...(args.board && { board: args.board }),
        },
      };
      const [data, total] = await Promise.all([
        prismadb.tasks.findMany({ where, ...paginationArgs(args), orderBy: { createdAt: "desc" } }),
        prismadb.tasks.count({ where }),
      ]);
      return listResponse(data, total, args.offset);
    },
```

(`section`, `user`, `status` stay as the pre-existing top-level task filters; only `board_relation` — the tasks→section→board relation the read helpers use — is always applied, with `board` ANDed into the same `assigned_section` relation filter when supplied.)

- [ ] **Step 5: Rewrite `get_task`, `create_task`, `update_task`, `move_task`, `delete_task`**

`projects_get_task`:
```ts
    async handler(args: { id: string }, _userId: string, user: AuthzUser) {
      await assertScopeOrNotFound(() => assertCanReadTask(user, args.id), "Task");
      const task = await prismadb.tasks.findUnique({
        where: { id: args.id },
        include: {
          comments: { orderBy: { createdAt: "desc" }, take: 20 },
          documents: { include: { document: true } },
          assigned_section: { select: { id: true, title: true, board: true } },
        },
      });
      if (!task) notFound("Task");
      return itemResponse(task);
    },
```

`projects_create_task` — resolve the section's board and require write on it:
```ts
    async handler(
      args: { title: string; content?: string; section: string; priority: string; dueDateAt?: string },
      _userId: string,
      user: AuthzUser
    ) {
      const sec = await prismadb.sections.findUnique({ where: { id: args.section } });
      if (!sec) notFound("Section");
      await assertScopeOrNotFound(() => assertCanWriteBoard(user, sec.board), "Board");
      const maxPos = await prismadb.tasks.aggregate({
        where: { section: args.section },
        _max: { position: true },
      });
      const task = await prismadb.tasks.create({
        data: {
          v: 0,
          title: args.title,
          content: args.content,
          section: args.section,
          priority: args.priority,
          position: (maxPos._max.position ?? BigInt(0)) + BigInt(1000),
          user: user.id,
          createdBy: user.id,
          updatedBy: user.id,
          ...(args.dueDateAt && { dueDateAt: new Date(args.dueDateAt) }),
        },
      });
      return itemResponse(task);
    },
```

`projects_update_task`:
```ts
    async handler(args: Record<string, any>, _userId: string, user: AuthzUser) {
      await assertScopeOrNotFound(() => assertCanWriteTask(user, args.id), "Task");
      const { id, dueDateAt, ...rest } = args;
      const task = await prismadb.tasks.update({
        where: { id },
        data: {
          ...rest,
          ...(dueDateAt !== undefined && { dueDateAt: new Date(dueDateAt) }),
          updatedBy: user.id,
        },
      });
      return itemResponse(task);
    },
```

`projects_move_task` — write on the source task AND the destination board:
```ts
    async handler(args: { id: string; section: string; position?: number }, _userId: string, user: AuthzUser) {
      await assertScopeOrNotFound(() => assertCanWriteTask(user, args.id), "Task");
      const sec = await prismadb.sections.findUnique({ where: { id: args.section } });
      if (!sec) notFound("Section");
      await assertScopeOrNotFound(() => assertCanWriteBoard(user, sec.board), "Board");
      const task = await prismadb.tasks.update({
        where: { id: args.id },
        data: {
          section: args.section,
          ...(args.position !== undefined && { position: BigInt(args.position) }),
          updatedBy: user.id,
        },
      });
      return itemResponse(task);
    },
```

`projects_delete_task`:
```ts
    async handler(args: { id: string }, _userId: string, user: AuthzUser) {
      await assertScopeOrNotFound(() => assertCanWriteTask(user, args.id), "Task");
      const task = await prismadb.tasks.update({
        where: { id: args.id },
        data: { taskStatus: "COMPLETE", updatedBy: user.id },
      });
      return itemResponse({ id: task.id, status: "COMPLETE" });
    },
```

- [ ] **Step 6: Delete `userBoardWhere`** — remove the function at `projects.ts:13-21`. It now has zero references (grep to confirm: `grep -n userBoardWhere lib/mcp/tools/projects.ts` returns nothing).

- [ ] **Step 7: GREEN + typecheck** — the task test file passes; `pnpm exec tsc --noEmit` clean (no unused-function error, since `userBoardWhere` is gone).

- [ ] **Step 8: Commit** — `git add lib/mcp/tools/projects.ts lib/mcp/__tests__/projects-tasks-scope.test.ts && git commit -m "feat(mcp): object-level authorization on project task tools; drop userBoardWhere"`

---

### Task 5: Guard Comment + Document-link tools

**Files:**
- Modify: `lib/mcp/tools/projects.ts` (`add_comment`, `list_comments`, `assign_document`)
- Test: `lib/mcp/__tests__/projects-comments-docs-scope.test.ts` (new)

**Interfaces:**
- Consumes: `assertScopeOrNotFound`, `assertCanReadTask`, `assertCanWriteTask` (imported); adds `assertCanReadDocument`.

- [ ] **Step 1: Write the failing tests** — mock prismadb `tasksComments: { findMany, count, create }`, `documentsToTasks: { create }`. Cases:

```ts
it("add_comment: denies write on the task and does not create", async () => {
  (assertCanWriteTask as jest.Mock).mockRejectedValue(new AuthorizationError());
  await expect(call("projects_add_comment", { task: "t-victim", comment: "x" })).rejects.toThrow("NOT_FOUND");
  expect(assertCanWriteTask).toHaveBeenCalledWith(USER, "t-victim");
  expect(prismadb.tasksComments.create).not.toHaveBeenCalled();
});

it("list_comments: denies read on the task and does not list", async () => {
  (assertCanReadTask as jest.Mock).mockRejectedValue(new AuthorizationError());
  await expect(call("projects_list_comments", { task: "t-victim", limit: 20, offset: 0 })).rejects.toThrow("NOT_FOUND");
  expect(prismadb.tasksComments.findMany).not.toHaveBeenCalled();
});

it("assign_document: requires write on the task AND read on the document", async () => {
  (assertCanWriteTask as jest.Mock).mockResolvedValue(undefined);
  (assertCanReadDocument as jest.Mock).mockRejectedValue(new AuthorizationError());
  await expect(call("projects_assign_document", { task_id: "t-1", document_id: "d-victim" })).rejects.toThrow("NOT_FOUND");
  expect(assertCanWriteTask).toHaveBeenCalledWith(USER, "t-1");
  expect(assertCanReadDocument).toHaveBeenCalledWith(USER, "d-victim");
  expect(prismadb.documentsToTasks.create).not.toHaveBeenCalled();
});
```

Add `assertCanReadDocument: jest.fn()` to the `@/lib/authz` mock in this file's harness header.

- [ ] **Step 2: RED.**

- [ ] **Step 3: Add the document import** — extend the `@/lib/authz` import in `projects.ts` to add `assertCanReadDocument`.

- [ ] **Step 4: Rewrite the three handlers**

`projects_add_comment`:
```ts
    async handler(args: { task: string; comment: string }, _userId: string, user: AuthzUser) {
      await assertScopeOrNotFound(() => assertCanWriteTask(user, args.task), "Task");
      const tc = await prismadb.tasksComments.create({
        data: { v: 0, task: args.task, comment: args.comment, user: user.id },
      });
      return itemResponse(tc);
    },
```

`projects_list_comments`:
```ts
    async handler(args: { task: string; limit: number; offset: number }, _userId: string, user: AuthzUser) {
      await assertScopeOrNotFound(() => assertCanReadTask(user, args.task), "Task");
      const where = { task: args.task };
      const [data, total] = await Promise.all([
        prismadb.tasksComments.findMany({
          where,
          ...paginationArgs(args),
          orderBy: { createdAt: "desc" },
          include: { assigned_user: { select: { id: true, name: true } } },
        }),
        prismadb.tasksComments.count({ where }),
      ]);
      return listResponse(data, total, args.offset);
    },
```

`projects_assign_document`:
```ts
    async handler(args: { task_id: string; document_id: string }, _userId: string, user: AuthzUser) {
      await assertScopeOrNotFound(() => assertCanWriteTask(user, args.task_id), "Task");
      await assertScopeOrNotFound(() => assertCanReadDocument(user, args.document_id), "Document");
      await prismadb.documentsToTasks.create({
        data: { task_id: args.task_id, document_id: args.document_id },
      });
      return itemResponse({ task_id: args.task_id, document_id: args.document_id });
    },
```

- [ ] **Step 5: GREEN + typecheck.**
- [ ] **Step 6: Commit** — `git add lib/mcp/tools/projects.ts lib/mcp/__tests__/projects-comments-docs-scope.test.ts && git commit -m "feat(mcp): object-level authorization on project comment + document-link tools"`

---

### Task 6: Guard Watch tool

**Files:**
- Modify: `lib/mcp/tools/projects.ts` (`watch_board`)
- Test: `lib/mcp/__tests__/projects-watch-scope.test.ts` (new)

**Interfaces:**
- Consumes: `assertScopeOrNotFound`; adds `assertCanReadBoard`.

- [ ] **Step 1: Write the failing tests** — mock prismadb `boardWatchers: { create, delete }`. Cases:

```ts
it("watch_board: denies read on the board and does not create a watcher (escalation guard)", async () => {
  (assertCanReadBoard as jest.Mock).mockRejectedValue(new AuthorizationError());
  await expect(call("projects_watch_board", { board_id: "b-victim", watch: true })).rejects.toThrow("NOT_FOUND");
  expect(assertCanReadBoard).toHaveBeenCalledWith(USER, "b-victim");
  expect(prismadb.boardWatchers.create).not.toHaveBeenCalled();
});

it("watch_board: watches a readable board", async () => {
  (assertCanReadBoard as jest.Mock).mockResolvedValue(undefined);
  (prismadb.boardWatchers.create as jest.Mock).mockResolvedValue({});
  await call("projects_watch_board", { board_id: "b-1", watch: true });
  expect(prismadb.boardWatchers.create).toHaveBeenCalled();
});
```

Add `assertCanReadBoard: jest.fn()` to this file's `@/lib/authz` mock header.

- [ ] **Step 2: RED.**

- [ ] **Step 3: Add the import** — extend the `@/lib/authz` import in `projects.ts` to add `assertCanReadBoard`.

- [ ] **Step 4: Rewrite `watch_board`** — read gate before the watcher create/delete:
```ts
    async handler(args: { board_id: string; watch: boolean }, _userId: string, user: AuthzUser) {
      // Read gate: board watchers sit only in the read scope, so watching a
      // readable board grants nothing new; deny self-granting read to a board
      // the caller cannot see.
      await assertScopeOrNotFound(() => assertCanReadBoard(user, args.board_id), "Board");
      if (args.watch) {
        await prismadb.boardWatchers.create({
          data: { board_id: args.board_id, user_id: user.id },
        }).catch(() => {});
      } else {
        await prismadb.boardWatchers.delete({
          where: { board_id_user_id: { board_id: args.board_id, user_id: user.id } },
        }).catch(() => {});
      }
      return itemResponse({ board_id: args.board_id, watching: args.watch });
    },
```

- [ ] **Step 5: GREEN + typecheck.**
- [ ] **Step 6: Commit** — `git add lib/mcp/tools/projects.ts lib/mcp/__tests__/projects-watch-scope.test.ts && git commit -m "feat(mcp): read-scoped authorization on project watch_board (escalation fix)"`

---

### Task 7: Verification gate + coverage sweep

**Files:**
- Modify: `docs/superpowers/specs/2026-07-21-mcp-project-tools-authz-design.md` (mark implemented)

- [ ] **Step 1: Coverage sweep** — every mutating/reading `projects_*` handler must reference an assert or a scope predicate, and `userBoardWhere` must be gone:

```bash
grep -n 'userBoardWhere' lib/mcp/tools/projects.ts   # expect: no output
# Every handler should now reference one of: assertCanReadBoard/assertCanWriteBoard/
# assertCanReadTask/assertCanWriteTask/assertCanReadDocument/boardReadScopeWhere.
grep -c 'assertCan\|boardReadScopeWhere' lib/mcp/tools/projects.ts   # expect: >= 14
```

List any `projects_*` handler that still does a bare `findUnique`/`create`/`update`/`delete` on a client-supplied id with no preceding assert (other than `create_board`, which is auth-only by design). A straggler is a failed task, not a note.

- [ ] **Step 2: Full suite** — `./node_modules/.bin/jest` — all pass (baseline for this branch is `dev`'s suite plus the new MCP scope suites, 0 failures).

- [ ] **Step 3: Typecheck + build** — `pnpm exec tsc --noEmit && pnpm build` — both succeed.

- [ ] **Step 4: Mark the spec implemented** — set `Status:` to implemented, record the residuals (task-assignee write breadth; public-board creation) and the coverage-sweep result.

- [ ] **Step 5: Commit (no push — final review first)**

```bash
git add docs/superpowers/specs/2026-07-21-mcp-project-tools-authz-design.md
git commit -m "docs: mark MCP project-tools authz workstream implemented"
```

---

## Notes for the executor

- The dispatcher already passes `(args, mcpUser.id, mcpUser)`; you are only changing handler bodies and signatures, never `app/api/mcp/[transport]/route.ts`.
- Denials must surface as `NOT_FOUND` — always go through `assertScopeOrNotFound`, never let a raw `AuthorizationError` escape a handler (it would map to `INTERNAL_ERROR`).
- `create_board` is the only write tool with no object-level assert (a new board is owned by its creator); it still stamps `user.id`.
- Every scope test must fail with the guard removed. If a test passes against the pre-fix handler, it is not testing the guard — fix the test before moving on.
- If the Agent classifier blocks subagent dispatch (as in workstream A), execute inline with tsc + jest as the gate.
