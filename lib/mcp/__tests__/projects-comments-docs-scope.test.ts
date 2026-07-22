// Object-level authorization regression tests for MCP project COMMENT and
// DOCUMENT-LINK tools (GHSA-vq6p-3qj5-p666).

jest.mock("@/lib/authz", () => ({
  assertCanReadTask: jest.fn(),
  assertCanWriteTask: jest.fn(),
  assertCanReadDocument: jest.fn(),
  AuthorizationError: jest.requireActual("@/lib/authz/errors").AuthorizationError,
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    tasksComments: { findMany: jest.fn(), count: jest.fn(), create: jest.fn() },
    documentsToTasks: { create: jest.fn() },
  },
}));

import {
  assertCanReadTask,
  assertCanWriteTask,
  assertCanReadDocument,
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
const readDoc = assertCanReadDocument as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe("projects_add_comment", () => {
  it("denies write on the task and does not create", async () => {
    writeTask.mockRejectedValue(new AuthorizationError());
    await expect(call("projects_add_comment", { task: "t-victim", comment: "x" })).rejects.toThrow("NOT_FOUND");
    expect(writeTask).toHaveBeenCalledWith(USER, "t-victim");
    expect(prismadb.tasksComments.create).not.toHaveBeenCalled();
  });
  it("creates for an authorized caller", async () => {
    writeTask.mockResolvedValue(undefined);
    (prismadb.tasksComments.create as jest.Mock).mockResolvedValue({ id: "c-1" });
    await call("projects_add_comment", { task: "t-1", comment: "x" });
    expect(prismadb.tasksComments.create).toHaveBeenCalled();
  });
});

describe("projects_list_comments", () => {
  it("denies read on the task and does not list", async () => {
    readTask.mockRejectedValue(new AuthorizationError());
    await expect(
      call("projects_list_comments", { task: "t-victim", limit: 20, offset: 0 })
    ).rejects.toThrow("NOT_FOUND");
    expect(prismadb.tasksComments.findMany).not.toHaveBeenCalled();
  });
  it("lists for an authorized reader", async () => {
    readTask.mockResolvedValue(undefined);
    (prismadb.tasksComments.findMany as jest.Mock).mockResolvedValue([]);
    (prismadb.tasksComments.count as jest.Mock).mockResolvedValue(0);
    await call("projects_list_comments", { task: "t-1", limit: 20, offset: 0 });
    expect(prismadb.tasksComments.findMany).toHaveBeenCalled();
  });
});

describe("projects_assign_document", () => {
  it("requires write on the task AND read on the document", async () => {
    writeTask.mockResolvedValue(undefined);
    readDoc.mockRejectedValue(new AuthorizationError());
    await expect(
      call("projects_assign_document", { task_id: "t-1", document_id: "d-victim" })
    ).rejects.toThrow("NOT_FOUND");
    expect(writeTask).toHaveBeenCalledWith(USER, "t-1");
    expect(readDoc).toHaveBeenCalledWith(USER, "d-victim");
    expect(prismadb.documentsToTasks.create).not.toHaveBeenCalled();
  });
  it("denies at the task before touching the document", async () => {
    writeTask.mockRejectedValue(new AuthorizationError());
    await expect(
      call("projects_assign_document", { task_id: "t-victim", document_id: "d-1" })
    ).rejects.toThrow("NOT_FOUND");
    expect(prismadb.documentsToTasks.create).not.toHaveBeenCalled();
  });
  it("links when both are authorized", async () => {
    writeTask.mockResolvedValue(undefined);
    readDoc.mockResolvedValue(undefined);
    (prismadb.documentsToTasks.create as jest.Mock).mockResolvedValue({});
    await call("projects_assign_document", { task_id: "t-1", document_id: "d-1" });
    expect(prismadb.documentsToTasks.create).toHaveBeenCalled();
  });
});
