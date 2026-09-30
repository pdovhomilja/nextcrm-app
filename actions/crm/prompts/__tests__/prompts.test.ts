jest.mock("@/lib/authz", () => ({
  requireAuthenticated: jest.fn(),
  requireRole: jest.fn(),
  AuthenticationError: class AuthenticationError extends Error {},
  AuthorizationError: class AuthorizationError extends Error {},
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Ai_Prompt: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/audit-log", () => ({
  writeAuditLog: jest.fn(),
  diffObjects: jest.fn(() => [{ field: "name", old: "Old", new: "New" }]),
}));

import { requireAuthenticated, requireRole, AuthorizationError } from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";
import { listPrompts } from "@/actions/crm/prompts/list-prompts";
import { createPrompt } from "@/actions/crm/prompts/create-prompt";
import { updatePrompt } from "@/actions/crm/prompts/update-prompt";
import { deletePrompt } from "@/actions/crm/prompts/delete-prompt";

const authed = requireAuthenticated as jest.Mock;
const role = requireRole as jest.Mock;
const ME = { id: "me", role: "user" };

beforeEach(() => {
  jest.clearAllMocks();
  authed.mockResolvedValue(ME);
  role.mockResolvedValue(undefined);
});

it("lists org + own personal prompts for a kind", async () => {
  (prismadb.crm_Ai_Prompt.findMany as jest.Mock).mockResolvedValue([{ id: "p1" }]);
  const out = await listPrompts({ kind: "EMAIL" });
  expect(out).toEqual([{ id: "p1" }]);
  expect(prismadb.crm_Ai_Prompt.findMany).toHaveBeenCalledWith({
    where: {
      deletedAt: null,
      kind: "EMAIL",
      OR: [{ scope: "ORG" }, { scope: "USER", user_id: "me" }],
    },
    orderBy: { name: "asc" },
  });
});

it("lets any user create a personal prompt with user_id set", async () => {
  (prismadb.crm_Ai_Prompt.create as jest.Mock).mockResolvedValue({ id: "p2" });
  const res = await createPrompt({ name: "Cold intro", body: "Write...", kind: "EMAIL", scope: "USER" });
  expect(res).toEqual({ data: { id: "p2" } });
  expect(role).not.toHaveBeenCalled();
  expect(prismadb.crm_Ai_Prompt.create).toHaveBeenCalledWith({
    data: { name: "Cold intro", body: "Write...", kind: "EMAIL", scope: "USER", user_id: "me", created_by: "me" },
  });
  expect(writeAuditLog).toHaveBeenCalledWith(
    expect.objectContaining({ entityType: "prompt", entityId: "p2", action: "created", userId: "me" })
  );
});

it("requires admin to create an org prompt", async () => {
  role.mockRejectedValue(new AuthorizationError());
  const res = await createPrompt({ name: "House voice", body: "x", kind: "EMAIL", scope: "ORG" });
  expect(res).toEqual({ error: "Forbidden" });
  expect(prismadb.crm_Ai_Prompt.create).not.toHaveBeenCalled();
});

describe("updatePrompt authz", () => {
  const findFirst = prismadb.crm_Ai_Prompt.findFirst as jest.Mock;
  const update = prismadb.crm_Ai_Prompt.update as jest.Mock;
  const input = { id: "p1", name: "New", body: "Body" };

  it("forbids a non-owner from editing a USER prompt", async () => {
    findFirst.mockResolvedValue({ id: "p1", scope: "USER", user_id: "someone-else" });
    const res = await updatePrompt(input);
    expect(res).toEqual({ error: "Forbidden" });
    expect(update).not.toHaveBeenCalled();
    expect(writeAuditLog).not.toHaveBeenCalled();
  });

  it("lets the owner edit their USER prompt", async () => {
    findFirst.mockResolvedValue({ id: "p1", scope: "USER", user_id: "me" });
    update.mockResolvedValue({ id: "p1" });
    const res = await updatePrompt(input);
    expect(res).toEqual({ data: { id: "p1" } });
    expect(update).toHaveBeenCalledWith({ where: { id: "p1" }, data: { name: "New", body: "Body" } });
    expect(writeAuditLog).toHaveBeenCalledWith({
      entityType: "prompt",
      entityId: "p1",
      action: "updated",
      changes: [{ field: "name", old: "Old", new: "New" }],
      userId: "me",
    });
  });

  it("forbids a non-admin from editing an ORG prompt", async () => {
    findFirst.mockResolvedValue({ id: "p1", scope: "ORG", user_id: null });
    role.mockRejectedValue(new AuthorizationError());
    const res = await updatePrompt(input);
    expect(res).toEqual({ error: "Forbidden" });
    expect(update).not.toHaveBeenCalled();
  });

  it("returns not found for a missing prompt", async () => {
    findFirst.mockResolvedValue(null);
    const res = await updatePrompt(input);
    expect(res).toEqual({ error: "Prompt not found" });
    expect(update).not.toHaveBeenCalled();
  });
});

describe("deletePrompt authz", () => {
  const findFirst = prismadb.crm_Ai_Prompt.findFirst as jest.Mock;
  const update = prismadb.crm_Ai_Prompt.update as jest.Mock;
  const del = (prismadb.crm_Ai_Prompt as unknown as { delete: jest.Mock }).delete;

  it("forbids a non-owner from deleting a USER prompt", async () => {
    findFirst.mockResolvedValue({ id: "p1", scope: "USER", user_id: "someone-else" });
    const res = await deletePrompt({ id: "p1" });
    expect(res).toEqual({ error: "Forbidden" });
    expect(update).not.toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
  });

  it("soft-deletes for the owner (no hard delete)", async () => {
    findFirst.mockResolvedValue({ id: "p1", scope: "USER", user_id: "me" });
    update.mockResolvedValue({ id: "p1" });
    const res = await deletePrompt({ id: "p1" });
    expect(res).toEqual({ data: { id: "p1" } });
    expect(update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { deletedAt: expect.any(Date), deletedBy: "me" },
    });
    expect(del).not.toHaveBeenCalled();
    expect(writeAuditLog).toHaveBeenCalledWith({
      entityType: "prompt",
      entityId: "p1",
      action: "deleted",
      changes: null,
      userId: "me",
    });
  });

  it("forbids a non-admin from deleting an ORG prompt", async () => {
    findFirst.mockResolvedValue({ id: "p1", scope: "ORG", user_id: null });
    role.mockRejectedValue(new AuthorizationError());
    const res = await deletePrompt({ id: "p1" });
    expect(res).toEqual({ error: "Forbidden" });
    expect(update).not.toHaveBeenCalled();
  });
});
