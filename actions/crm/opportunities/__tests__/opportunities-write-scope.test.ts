// Object-level authorization regression tests for opportunity write actions
// (GHSA-qwhm-9fcm-p878). Denial tests must fail against the pre-guard code.

jest.mock("@/lib/authz", () => ({
  requireAuthenticated: jest.fn(),
  assertCanWriteOpportunity: jest.fn(),
  assertCanWriteAccount: jest.fn(),
  AuthenticationError: class AuthenticationError extends Error {},
  AuthorizationError: class AuthorizationError extends Error {},
}));
jest.mock("@/lib/auth-server", () => ({
  getSession: jest.fn().mockResolvedValue({ user: { id: "owner" } }),
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Opportunities: {
      update: jest.fn().mockResolvedValue({ id: "o-1", sales_stage: null }),
      findUnique: jest.fn().mockResolvedValue({ id: "o-1", sales_stage: null, approval_status: "NONE" }),
      create: jest.fn().mockResolvedValue({ id: "o-1", sales_stage: null }),
    },
    users: { findFirst: jest.fn().mockResolvedValue(null) },
  },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn(), diffObjects: jest.fn(() => null) }));
jest.mock("@/inngest/client", () => ({ inngest: { send: jest.fn() } }));
jest.mock("@/lib/sendmail", () => ({ __esModule: true, default: jest.fn() }));
jest.mock("@/lib/currency", () => ({
  getDefaultCurrency: jest.fn().mockResolvedValue("USD"),
  getSnapshotRate: jest.fn().mockResolvedValue(null),
}));
jest.mock("@/lib/crm/stage-transition", () => ({ handleStageTransition: jest.fn() }));
jest.mock("@/lib/crm/approval-gate", () => ({ qualifiedEntryBlockReason: jest.fn().mockResolvedValue(null) }));

import {
  requireAuthenticated,
  assertCanWriteOpportunity,
  assertCanWriteAccount,
  AuthorizationError,
} from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import { createOpportunity } from "@/actions/crm/opportunities/create-opportunity";
import { updateOpportunity } from "@/actions/crm/opportunities/update-opportunity";
import { deleteOpportunity } from "@/actions/crm/opportunities/delete-opportunity";

const authed = requireAuthenticated as jest.Mock;
const assertOpp = assertCanWriteOpportunity as jest.Mock;
const assertAccount = assertCanWriteAccount as jest.Mock;
const oUpdate = prismadb.crm_Opportunities.update as jest.Mock;
const oCreate = prismadb.crm_Opportunities.create as jest.Mock;

const OWNER = { id: "owner", role: "user" };

beforeEach(() => {
  jest.clearAllMocks();
  authed.mockResolvedValue(OWNER);
  assertOpp.mockResolvedValue(undefined);
  assertAccount.mockResolvedValue(undefined);
});

describe("updateOpportunity", () => {
  it("denies a non-owner and does not update", async () => {
    assertOpp.mockRejectedValue(new AuthorizationError());
    const res = await updateOpportunity({ id: "victim" } as any);
    expect(res).toEqual({ error: "Forbidden" });
    expect(oUpdate).not.toHaveBeenCalled();
  });

  it("guards on data.id and updates for an owner", async () => {
    await updateOpportunity({ id: "o-1", name: "New" } as any);
    expect(assertOpp).toHaveBeenCalledWith(OWNER, "o-1");
    expect(oUpdate).toHaveBeenCalled();
  });
});

describe("deleteOpportunity", () => {
  it("denies a non-owner and does not soft-delete", async () => {
    assertOpp.mockRejectedValue(new AuthorizationError());
    const res = await deleteOpportunity("victim");
    expect(res).toEqual({ error: "Forbidden" });
    expect(oUpdate).not.toHaveBeenCalled();
  });

  it("guards on the opportunityId for an owner", async () => {
    await deleteOpportunity("o-1");
    expect(assertOpp).toHaveBeenCalledWith(OWNER, "o-1");
    expect(oUpdate).toHaveBeenCalled();
  });
});

describe("createOpportunity", () => {
  it("requires write on a linked account (parent-write) and does not create on denial", async () => {
    assertAccount.mockRejectedValue(new AuthorizationError());
    const res = await createOpportunity({ name: "X", account: "foreign-acc" } as any);
    expect(res).toEqual({ error: "Forbidden" });
    expect(assertAccount).toHaveBeenCalledWith(OWNER, "foreign-acc");
    expect(oCreate).not.toHaveBeenCalled();
  });

  it("plain create (no linked account) needs only authentication", async () => {
    await createOpportunity({ name: "X" } as any);
    expect(assertAccount).not.toHaveBeenCalled();
    expect(oCreate).toHaveBeenCalled();
  });
});
