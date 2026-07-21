// Object-level authorization regression tests for MCP project SECTION tools
// (GHSA-vq6p-3qj5-p666). AuthorizationError must be the real class (see note).

jest.mock("@/lib/authz", () => ({
  assertCanWriteBoard: jest.fn(),
  boardReadScopeWhere: jest.fn(() => ({ deletedAt: null, __scope: "read" })),
  AuthorizationError: jest.requireActual("@/lib/authz/errors").AuthorizationError,
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    sections: {
      findUnique: jest.fn(),
      aggregate: jest.fn().mockResolvedValue({ _max: { position: null } }),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
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

beforeEach(() => {
  jest.clearAllMocks();
  (prismadb.sections.aggregate as jest.Mock).mockResolvedValue({ _max: { position: null } });
});

describe("projects_create_section", () => {
  it("denies when the parent board is not writable", async () => {
    assertWrite.mockRejectedValue(new AuthorizationError());
    await expect(call("projects_create_section", { board: "b-victim", title: "S" })).rejects.toThrow("NOT_FOUND");
    expect(assertWrite).toHaveBeenCalledWith(USER, "b-victim");
    expect(prismadb.sections.create).not.toHaveBeenCalled();
  });

  it("creates for a writable parent board", async () => {
    assertWrite.mockResolvedValue(undefined);
    (prismadb.sections.create as jest.Mock).mockResolvedValue({ id: "s-1" });
    await call("projects_create_section", { board: "b-1", title: "S" });
    expect(prismadb.sections.create).toHaveBeenCalled();
  });
});

describe("projects_update_section", () => {
  it("resolves the parent board then denies write", async () => {
    (prismadb.sections.findUnique as jest.Mock).mockResolvedValue({ id: "s-1", board: "b-1" });
    assertWrite.mockRejectedValue(new AuthorizationError());
    await expect(call("projects_update_section", { id: "s-1", title: "x" })).rejects.toThrow("NOT_FOUND");
    expect(assertWrite).toHaveBeenCalledWith(USER, "b-1");
    expect(prismadb.sections.update).not.toHaveBeenCalled();
  });

  it("NOT_FOUND when the section does not exist", async () => {
    (prismadb.sections.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(call("projects_update_section", { id: "missing" })).rejects.toThrow("NOT_FOUND");
    expect(assertWrite).not.toHaveBeenCalled();
  });

  it("updates for a writable parent board", async () => {
    (prismadb.sections.findUnique as jest.Mock).mockResolvedValue({ id: "s-1", board: "b-1" });
    assertWrite.mockResolvedValue(undefined);
    (prismadb.sections.update as jest.Mock).mockResolvedValue({ id: "s-1" });
    await call("projects_update_section", { id: "s-1", title: "x" });
    expect(prismadb.sections.update).toHaveBeenCalled();
  });
});

describe("projects_delete_section", () => {
  it("resolves the parent board then denies write", async () => {
    (prismadb.sections.findUnique as jest.Mock).mockResolvedValue({ id: "s-1", board: "b-1", _count: { tasks: 0 } });
    assertWrite.mockRejectedValue(new AuthorizationError());
    await expect(call("projects_delete_section", { id: "s-1" })).rejects.toThrow("NOT_FOUND");
    expect(assertWrite).toHaveBeenCalledWith(USER, "b-1");
    expect(prismadb.sections.delete).not.toHaveBeenCalled();
  });

  it("deletes an empty section for a writable parent board", async () => {
    (prismadb.sections.findUnique as jest.Mock).mockResolvedValue({ id: "s-1", board: "b-1", _count: { tasks: 0 } });
    assertWrite.mockResolvedValue(undefined);
    (prismadb.sections.delete as jest.Mock).mockResolvedValue({});
    await call("projects_delete_section", { id: "s-1" });
    expect(prismadb.sections.delete).toHaveBeenCalled();
  });
});
