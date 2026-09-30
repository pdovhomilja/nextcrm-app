jest.mock("@/lib/authz", () => ({
  requireAuthenticated: jest.fn(),
  assertCanReadTarget: jest.fn(),
  AuthenticationError: class AuthenticationError extends Error {},
  AuthorizationError: class AuthorizationError extends Error {},
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: { crm_Target_Email: { findMany: jest.fn() } },
}));

import { requireAuthenticated, assertCanReadTarget } from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import { listTargetEmails } from "@/actions/crm/targets/list-target-emails";

const authed = requireAuthenticated as jest.Mock;
const assertR = assertCanReadTarget as jest.Mock;
const findMany = prismadb.crm_Target_Email.findMany as jest.Mock;
const TARGET = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  jest.clearAllMocks();
  authed.mockResolvedValue({ id: "me", role: "user" });
  assertR.mockResolvedValue(undefined);
  findMany.mockResolvedValue([
    { id: "e1", subject: "Hi", status: "SENT", sent_at: new Date(), error_message: null, included_homepage: false, created_on: new Date() },
  ]);
});

it("returns the target's emails scoped to live rows, newest first", async () => {
  const rows = await listTargetEmails(TARGET);
  expect(rows).toHaveLength(1);
  expect(findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: { targetId: TARGET, deletedAt: null },
      orderBy: { created_on: "desc" },
    })
  );
});

it("returns [] (no throw) when unauthenticated", async () => {
  const { AuthenticationError } = jest.requireMock("@/lib/authz");
  authed.mockRejectedValue(new AuthenticationError());
  expect(await listTargetEmails(TARGET)).toEqual([]);
  expect(findMany).not.toHaveBeenCalled();
});

it("returns [] when the caller cannot read the target", async () => {
  const { AuthorizationError } = jest.requireMock("@/lib/authz");
  assertR.mockRejectedValue(new AuthorizationError());
  expect(await listTargetEmails(TARGET)).toEqual([]);
  expect(findMany).not.toHaveBeenCalled();
});
