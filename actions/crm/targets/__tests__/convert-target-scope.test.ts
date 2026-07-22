// Object-level authorization for convertTarget (GHSA-qwhm-9fcm-p878). This is a
// directly-callable "use server" action (invoked from UpdateTargetForm, not only
// via convertTargetToDeal), so it needs its own write-scope guard: converting
// creates an account + contact and mutates the target.

jest.mock("@/lib/authz", () => ({
  requireAuthenticated: jest.fn(),
  assertCanWriteTarget: jest.fn(),
  AuthenticationError: class AuthenticationError extends Error {},
  AuthorizationError: class AuthorizationError extends Error {},
}));
jest.mock("@/lib/auth-server", () => ({
  getSession: jest.fn().mockResolvedValue({ user: { id: "owner" } }),
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Targets: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

import {
  requireAuthenticated,
  assertCanWriteTarget,
  AuthorizationError,
} from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import { convertTarget } from "@/actions/crm/targets/convert-target";

const authed = requireAuthenticated as jest.Mock;
const assertTarget = assertCanWriteTarget as jest.Mock;
const targetFind = prismadb.crm_Targets.findFirst as jest.Mock;
const tx = prismadb.$transaction as jest.Mock;

const OWNER = { id: "owner", role: "user" };

beforeEach(() => {
  jest.clearAllMocks();
  authed.mockResolvedValue(OWNER);
});

it("denies a non-owner before reading or converting the target", async () => {
  assertTarget.mockRejectedValue(new AuthorizationError());
  const res = await convertTarget("victim");
  expect(res).toEqual({ error: "Forbidden" });
  expect(assertTarget).toHaveBeenCalledWith(OWNER, "victim");
  expect(targetFind).not.toHaveBeenCalled();
  expect(tx).not.toHaveBeenCalled();
});

it("proceeds for an owner (guard passes, then reads the target)", async () => {
  assertTarget.mockResolvedValue(undefined);
  targetFind.mockResolvedValue(null); // short-circuits to Target not found
  const res = await convertTarget("t-1");
  expect(assertTarget).toHaveBeenCalledWith(OWNER, "t-1");
  expect(targetFind).toHaveBeenCalled();
  expect(res).toEqual({ error: "Target not found" });
});
