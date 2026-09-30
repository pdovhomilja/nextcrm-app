jest.mock("@/lib/authz", () => ({
  requireAuthenticated: jest.fn(),
  requireRole: jest.fn(),
  AuthenticationError: class AuthenticationError extends Error {},
  AuthorizationError: class AuthorizationError extends Error {},
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Ai_Prompt: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/audit-log", () => ({
  writeAuditLog: jest.fn(),
  diffObjects: jest.fn(() => []),
}));

import { requireAuthenticated, requireRole, AuthorizationError } from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import { createPrompt } from "@/actions/crm/prompts/create-prompt";
import { updatePrompt } from "@/actions/crm/prompts/update-prompt";
import { deletePrompt } from "@/actions/crm/prompts/delete-prompt";

const authed = requireAuthenticated as jest.Mock;
const role = requireRole as jest.Mock;
const create = prismadb.crm_Ai_Prompt.create as jest.Mock;
const update = prismadb.crm_Ai_Prompt.update as jest.Mock;
const findFirst = prismadb.crm_Ai_Prompt.findFirst as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  authed.mockResolvedValue({ id: "me", role: "user" });
  // default: caller is admin; non-admin tests make requireRole reject
  role.mockResolvedValue(undefined);
});

const asNonAdmin = () => role.mockRejectedValue(new AuthorizationError());

describe("HOMEPAGE_BASE admin gate", () => {
  it("create: non-admin is Forbidden, nothing written", async () => {
    asNonAdmin();
    const res = await createPrompt({ name: "Designer", body: "x", kind: "HOMEPAGE_BASE", scope: "USER" });
    expect(res).toEqual({ error: "Forbidden" });
    expect(role).toHaveBeenCalledWith(["admin"]);
    expect(create).not.toHaveBeenCalled();
  });

  it("create: admin can create a HOMEPAGE_BASE prompt", async () => {
    create.mockResolvedValue({ id: "b1" });
    const res = await createPrompt({ name: "Designer", body: "x", kind: "HOMEPAGE_BASE", scope: "ORG" });
    expect(res).toEqual({ data: { id: "b1" } });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("create: EMAIL personal prompt by a normal user is unaffected", async () => {
    asNonAdmin();
    create.mockResolvedValue({ id: "e1" });
    const res = await createPrompt({ name: "Intro", body: "x", kind: "EMAIL", scope: "USER" });
    expect(res).toEqual({ data: { id: "e1" } });
    expect(role).not.toHaveBeenCalled();
  });

  it("update: non-admin cannot edit a HOMEPAGE_BASE prompt they own", async () => {
    asNonAdmin();
    findFirst.mockResolvedValue({ id: "b1", kind: "HOMEPAGE_BASE", scope: "USER", user_id: "me" });
    const res = await updatePrompt({ id: "b1", name: "N", body: "B" });
    expect(res).toEqual({ error: "Forbidden" });
    expect(update).not.toHaveBeenCalled();
  });

  it("update: admin can edit a HOMEPAGE_BASE prompt", async () => {
    findFirst.mockResolvedValue({ id: "b1", kind: "HOMEPAGE_BASE", scope: "ORG", user_id: null });
    update.mockResolvedValue({ id: "b1" });
    const res = await updatePrompt({ id: "b1", name: "N", body: "B" });
    expect(res).toEqual({ data: { id: "b1" } });
  });

  it("delete: non-admin cannot delete a HOMEPAGE_BASE prompt they own", async () => {
    asNonAdmin();
    findFirst.mockResolvedValue({ id: "b1", kind: "HOMEPAGE_BASE", scope: "USER", user_id: "me" });
    const res = await deletePrompt({ id: "b1" });
    expect(res).toEqual({ error: "Forbidden" });
    expect(update).not.toHaveBeenCalled();
  });

  it("delete: admin can delete a HOMEPAGE_BASE prompt", async () => {
    findFirst.mockResolvedValue({ id: "b1", kind: "HOMEPAGE_BASE", scope: "ORG", user_id: null });
    update.mockResolvedValue({ id: "b1" });
    const res = await deletePrompt({ id: "b1" });
    expect(res).toEqual({ data: { id: "b1" } });
  });
});
