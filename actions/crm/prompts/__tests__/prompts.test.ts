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
    },
  },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

import { requireAuthenticated, requireRole, AuthorizationError } from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import { listPrompts } from "@/actions/crm/prompts/list-prompts";
import { createPrompt } from "@/actions/crm/prompts/create-prompt";

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
});

it("requires admin to create an org prompt", async () => {
  role.mockRejectedValue(new AuthorizationError());
  const res = await createPrompt({ name: "House voice", body: "x", kind: "EMAIL", scope: "ORG" });
  expect(res).toEqual({ error: "Forbidden" });
  expect(prismadb.crm_Ai_Prompt.create).not.toHaveBeenCalled();
});
