// Object-level authorization regression tests for MCP project BOARD tools
// (GHSA-vq6p-3qj5-p666). @/lib/authz is mocked because its barrel pulls in
// better-auth (ESM) which breaks ts-jest.

// AuthorizationError MUST be the real class from the leaf errors module, so the
// adapter's `instanceof AuthorizationError` (which imports the same real class)
// matches instances thrown here. A fresh `class extends Error` would not match,
// and denials would propagate instead of converting to NOT_FOUND.
jest.mock("@/lib/authz", () => ({
  assertCanWriteBoard: jest.fn(),
  boardReadScopeWhere: jest.fn(() => ({ deletedAt: null, __scope: "read" })),
  AuthorizationError: jest.requireActual("@/lib/authz/errors").AuthorizationError,
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    boards: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { assertCanWriteBoard, AuthorizationError } from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import { projectTools } from "@/lib/mcp/tools/projects";

const USER = { id: "u1", role: "user" } as const;
function call(name: string, args: any) {
  const tool = projectTools.find((t) => t.name === name)!;
  return (tool.handler as any)(args, USER.id, USER);
}

const assertWrite = assertCanWriteBoard as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe("projects_update_board", () => {
  it("denies a non-owner (NOT_FOUND) and does not update", async () => {
    assertWrite.mockRejectedValue(new AuthorizationError());
    await expect(call("projects_update_board", { id: "b-victim", title: "x" })).rejects.toThrow("NOT_FOUND");
    expect(assertWrite).toHaveBeenCalledWith(USER, "b-victim");
    expect(prismadb.boards.update).not.toHaveBeenCalled();
  });

  it("updates for an owner", async () => {
    assertWrite.mockResolvedValue(undefined);
    (prismadb.boards.update as jest.Mock).mockResolvedValue({ id: "b-1" });
    await call("projects_update_board", { id: "b-1", title: "x" });
    expect(prismadb.boards.update).toHaveBeenCalled();
  });
});

describe("projects_delete_board", () => {
  it("denies a non-owner and does not soft-delete", async () => {
    assertWrite.mockRejectedValue(new AuthorizationError());
    await expect(call("projects_delete_board", { id: "b-victim" })).rejects.toThrow("NOT_FOUND");
    expect(prismadb.boards.update).not.toHaveBeenCalled();
  });

  it("soft-deletes for an owner", async () => {
    assertWrite.mockResolvedValue(undefined);
    (prismadb.boards.update as jest.Mock).mockResolvedValue({ id: "b-1", deletedAt: new Date() });
    await call("projects_delete_board", { id: "b-1" });
    expect(assertWrite).toHaveBeenCalledWith(USER, "b-1");
    expect(prismadb.boards.update).toHaveBeenCalled();
  });
});

describe("projects_list_boards", () => {
  it("filters by boardReadScopeWhere", async () => {
    (prismadb.boards.findMany as jest.Mock).mockResolvedValue([]);
    (prismadb.boards.count as jest.Mock).mockResolvedValue(0);
    await call("projects_list_boards", { limit: 20, offset: 0 });
    const arg = (prismadb.boards.findMany as jest.Mock).mock.calls[0][0];
    expect(arg.where).toMatchObject({ __scope: "read" });
  });
});

describe("projects_get_board", () => {
  it("scopes the findFirst by boardReadScopeWhere", async () => {
    (prismadb.boards.findFirst as jest.Mock).mockResolvedValue({ id: "b-1" });
    await call("projects_get_board", { id: "b-1" });
    const arg = (prismadb.boards.findFirst as jest.Mock).mock.calls[0][0];
    expect(arg.where).toMatchObject({ id: "b-1", __scope: "read" });
  });

  it("returns NOT_FOUND when the board is out of scope", async () => {
    (prismadb.boards.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(call("projects_get_board", { id: "b-victim" })).rejects.toThrow("NOT_FOUND");
  });
});

describe("projects_create_board", () => {
  it("stamps the caller as owner", async () => {
    (prismadb.boards.create as jest.Mock).mockResolvedValue({ id: "b-new" });
    await call("projects_create_board", { title: "T", description: "D" });
    const data = (prismadb.boards.create as jest.Mock).mock.calls[0][0].data;
    expect(data.user).toBe("u1");
    expect(data.createdBy).toBe("u1");
    expect(data.updatedBy).toBe("u1");
  });
});
