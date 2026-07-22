// Object-level authorization regression tests for CRM task write actions
// (GHSA-qwhm-9fcm-p878). crm_Accounts_Tasks ownership = creator or assignee.

jest.mock("@/lib/authz", () => ({
  requireAuthenticated: jest.fn(),
  assertCanWriteCrmTask: jest.fn(),
  AuthenticationError: class AuthenticationError extends Error {},
  AuthorizationError: class AuthorizationError extends Error {},
}));
jest.mock("@/lib/auth-server", () => ({
  getSession: jest.fn().mockResolvedValue({ user: { id: "owner" } }),
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Accounts_Tasks: {
      findUnique: jest.fn().mockResolvedValue({ id: "t-1" }),
      delete: jest.fn().mockResolvedValue({ id: "t-1" }),
    },
    tasksComments: {
      create: jest.fn().mockResolvedValue({ id: "cm-1" }),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    documentsToCrmAccountsTasks: {
      create: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

import {
  requireAuthenticated,
  assertCanWriteCrmTask,
  AuthorizationError,
} from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import { addComment } from "@/actions/crm/tasks/add-comment";
import {
  assignDocumentToCrmTask,
  disconnectDocumentFromCrmTask,
} from "@/actions/crm/tasks/assign-document";
import { deleteTask } from "@/actions/crm/tasks/delete-task";

const authed = requireAuthenticated as jest.Mock;
const assertTask = assertCanWriteCrmTask as jest.Mock;
const commentCreate = prismadb.tasksComments.create as jest.Mock;
const docCreate = prismadb.documentsToCrmAccountsTasks.create as jest.Mock;
const docDelete = prismadb.documentsToCrmAccountsTasks.delete as jest.Mock;
const taskDelete = prismadb.crm_Accounts_Tasks.delete as jest.Mock;

const OWNER = { id: "owner", role: "user" };

beforeEach(() => {
  jest.clearAllMocks();
  authed.mockResolvedValue(OWNER);
  assertTask.mockResolvedValue(undefined);
});

describe("addComment", () => {
  it("denies a non-owner and does not create a comment", async () => {
    assertTask.mockRejectedValue(new AuthorizationError());
    const res = await addComment({ taskId: "victim", comment: "x" });
    expect(res).toEqual({ error: "Forbidden" });
    expect(assertTask).toHaveBeenCalledWith(OWNER, "victim");
    expect(commentCreate).not.toHaveBeenCalled();
  });

  it("creates a comment for an owner", async () => {
    await addComment({ taskId: "t-1", comment: "x" });
    expect(assertTask).toHaveBeenCalledWith(OWNER, "t-1");
    expect(commentCreate).toHaveBeenCalled();
  });
});

describe("assignDocumentToCrmTask", () => {
  it("denies a non-owner and does not link the document", async () => {
    assertTask.mockRejectedValue(new AuthorizationError());
    const res = await assignDocumentToCrmTask({ documentId: "d-1", taskId: "victim" });
    expect(res).toEqual({ error: "Forbidden" });
    expect(docCreate).not.toHaveBeenCalled();
  });

  it("links for an owner", async () => {
    await assignDocumentToCrmTask({ documentId: "d-1", taskId: "t-1" });
    expect(assertTask).toHaveBeenCalledWith(OWNER, "t-1");
    expect(docCreate).toHaveBeenCalled();
  });
});

describe("disconnectDocumentFromCrmTask", () => {
  it("denies a non-owner and does not unlink the document", async () => {
    assertTask.mockRejectedValue(new AuthorizationError());
    const res = await disconnectDocumentFromCrmTask({ documentId: "d-1", taskId: "victim" });
    expect(res).toEqual({ error: "Forbidden" });
    expect(docDelete).not.toHaveBeenCalled();
  });
});

describe("deleteTask", () => {
  it("denies a non-owner and does not delete the task", async () => {
    assertTask.mockRejectedValue(new AuthorizationError());
    const res = await deleteTask("victim");
    expect(res).toEqual({ error: "Forbidden" });
    expect(assertTask).toHaveBeenCalledWith(OWNER, "victim");
    expect(taskDelete).not.toHaveBeenCalled();
  });

  it("deletes for an owner", async () => {
    await deleteTask("t-1");
    expect(assertTask).toHaveBeenCalledWith(OWNER, "t-1");
    expect(taskDelete).toHaveBeenCalled();
  });
});
