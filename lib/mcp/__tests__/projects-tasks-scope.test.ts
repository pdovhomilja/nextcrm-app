// Object-level authorization regression tests for MCP project TASK tools
// (GHSA-vq6p-3qj5-p666). AuthorizationError must be the real class.

jest.mock("@/lib/authz", () => ({
  assertCanReadTask: jest.fn(),
  assertCanWriteTask: jest.fn(),
  assertCanWriteBoard: jest.fn(),
  boardReadScopeWhere: jest.fn(() => ({ deletedAt: null, __scope: "read" })),
  AuthorizationError: jest.requireActual("@/lib/authz/errors").AuthorizationError,
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    tasks: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      aggregate: jest.fn().mockResolvedValue({ _max: { position: null } }),
    },
    sections: { findUnique: jest.fn() },
  },
}));

import {
  assertCanReadTask,
  assertCanWriteTask,
  assertCanWriteBoard,
  AuthorizationError,
} from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import { projectTools } from "@/lib/mcp/tools/projects";

const USER = { id: "u1", role: "user" } as const;
function call(name: string, args: any) {
  const tool = projectTools.find((t) => t.name === name)!;
  return (tool.handler as any)(args, USER.id, USER);
}
const readTask = assertCanReadTask as jest.Mock;
const writeTask = assertCanWriteTask as jest.Mock;
const writeBoard = assertCanWriteBoard as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  (prismadb.tasks.aggregate as jest.Mock).mockResolvedValue({ _max: { position: null } });
});

describe("projects_update_task", () => {
  it("denies and does not update", async () => {
    writeTask.mockRejectedValue(new AuthorizationError());
    await expect(call("projects_update_task", { id: "t-victim", title: "x" })).rejects.toThrow("NOT_FOUND");
    expect(writeTask).toHaveBeenCalledWith(USER, "t-victim");
    expect(prismadb.tasks.update).not.toHaveBeenCalled();
  });
  it("updates for an authorized caller", async () => {
    writeTask.mockResolvedValue(undefined);
    (prismadb.tasks.update as jest.Mock).mockResolvedValue({ id: "t-1" });
    await call("projects_update_task", { id: "t-1", title: "x" });
    expect(prismadb.tasks.update).toHaveBeenCalled();
  });
});

describe("projects_delete_task", () => {
  it("denies and does not update status", async () => {
    writeTask.mockRejectedValue(new AuthorizationError());
    await expect(call("projects_delete_task", { id: "t-victim" })).rejects.toThrow("NOT_FOUND");
    expect(prismadb.tasks.update).not.toHaveBeenCalled();
  });
});

describe("projects_get_task", () => {
  it("denies read and does not fetch the task body", async () => {
    readTask.mockRejectedValue(new AuthorizationError());
    await expect(call("projects_get_task", { id: "t-victim" })).rejects.toThrow("NOT_FOUND");
    expect(prismadb.tasks.findUnique).not.toHaveBeenCalled();
  });
});

describe("projects_create_task", () => {
  it("requires write on the parent board (via the section)", async () => {
    (prismadb.sections.findUnique as jest.Mock).mockResolvedValue({ id: "s-1", board: "b-1" });
    writeBoard.mockRejectedValue(new AuthorizationError());
    await expect(
      call("projects_create_task", { title: "T", section: "s-1", priority: "Normal" })
    ).rejects.toThrow("NOT_FOUND");
    expect(writeBoard).toHaveBeenCalledWith(USER, "b-1");
    expect(prismadb.tasks.create).not.toHaveBeenCalled();
  });
  it("NOT_FOUND when the section does not exist", async () => {
    (prismadb.sections.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(
      call("projects_create_task", { title: "T", section: "missing", priority: "Normal" })
    ).rejects.toThrow("NOT_FOUND");
    expect(writeBoard).not.toHaveBeenCalled();
  });
});

describe("projects_move_task", () => {
  it("requires write on BOTH the source task and the destination board", async () => {
    writeTask.mockResolvedValue(undefined); // source ok
    (prismadb.sections.findUnique as jest.Mock).mockResolvedValue({ id: "s-dest", board: "b-dest" });
    writeBoard.mockRejectedValue(new AuthorizationError()); // dest denied
    await expect(call("projects_move_task", { id: "t-1", section: "s-dest" })).rejects.toThrow("NOT_FOUND");
    expect(writeTask).toHaveBeenCalledWith(USER, "t-1");
    expect(writeBoard).toHaveBeenCalledWith(USER, "b-dest");
    expect(prismadb.tasks.update).not.toHaveBeenCalled();
  });
  it("denies at the source task before touching the destination", async () => {
    writeTask.mockRejectedValue(new AuthorizationError());
    await expect(call("projects_move_task", { id: "t-victim", section: "s-dest" })).rejects.toThrow("NOT_FOUND");
    expect(prismadb.tasks.update).not.toHaveBeenCalled();
  });
});

describe("projects_list_tasks", () => {
  it("always constrains to boards the user can read, even when a board id is supplied", async () => {
    (prismadb.tasks.findMany as jest.Mock).mockResolvedValue([]);
    (prismadb.tasks.count as jest.Mock).mockResolvedValue(0);
    await call("projects_list_tasks", { board: "b-any", limit: 20, offset: 0 });
    const where = (prismadb.tasks.findMany as jest.Mock).mock.calls[0][0].where;
    expect(where.assigned_section.board_relation).toMatchObject({ __scope: "read" });
    expect(where.assigned_section.board).toBe("b-any");
  });
});
