// Object-level authorization for setInactiveOpportunity (GHSA-qwhm-9fcm-p878).
// This mutating opportunity action lives outside actions/crm/opportunities/ and
// previously used a hand-rolled assigned_to-only + admin-only guard; it now uses
// the shared assertCanWriteOpportunity scope.

jest.mock("@/lib/authz", () => ({
  requireAuthenticated: jest.fn(),
  assertCanWriteOpportunity: jest.fn(),
  AuthenticationError: class AuthenticationError extends Error {},
  AuthorizationError: class AuthorizationError extends Error {},
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: { crm_Opportunities: { update: jest.fn().mockResolvedValue({ id: "o-1" }) } },
}));

import {
  requireAuthenticated,
  assertCanWriteOpportunity,
  AuthorizationError,
} from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import { setInactiveOpportunity } from "@/actions/crm/opportunity/dashboard/set-inactive";

const authed = requireAuthenticated as jest.Mock;
const assertOpp = assertCanWriteOpportunity as jest.Mock;
const oUpdate = prismadb.crm_Opportunities.update as jest.Mock;

const OWNER = { id: "owner", role: "user" };

beforeEach(() => {
  jest.clearAllMocks();
  authed.mockResolvedValue(OWNER);
});

it("denies a non-owner and does not mutate", async () => {
  assertOpp.mockRejectedValue(new AuthorizationError());
  const res = await setInactiveOpportunity("victim");
  expect(res).toEqual({ error: "Forbidden" });
  expect(assertOpp).toHaveBeenCalledWith(OWNER, "victim");
  expect(oUpdate).not.toHaveBeenCalled();
});

it("sets inactive for a writable opportunity", async () => {
  assertOpp.mockResolvedValue(undefined);
  await setInactiveOpportunity("o-1");
  expect(assertOpp).toHaveBeenCalledWith(OWNER, "o-1");
  expect(oUpdate).toHaveBeenCalledWith({ where: { id: "o-1" }, data: { status: "INACTIVE" } });
});
