// Object-level authorization regression tests for target write actions
// (GHSA-qwhm-9fcm-p878). Denial tests must fail against the pre-guard code.

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
    crm_Targets: {
      update: jest.fn().mockResolvedValue({ id: "t-1" }),
      findFirst: jest.fn().mockResolvedValue({ id: "t-1", company: "Co", last_name: "X" }),
    },
    crm_Opportunities: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: "o-1", sales_stage: null }),
    },
    crm_campaign_sends: { findFirst: jest.fn().mockResolvedValue(null) },
    crm_Opportunities_Sales_Stages: { findFirst: jest.fn().mockResolvedValue({ id: "stage-0" }) },
  },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/inngest/client", () => ({ inngest: { send: jest.fn() } }));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn() }));
jest.mock("@/lib/crm/stage-transition", () => ({ handleStageTransition: jest.fn() }));
const mockConvertTarget = jest.fn();
jest.mock("@/actions/crm/targets/convert-target", () => ({ convertTarget: mockConvertTarget }));

import {
  requireAuthenticated,
  assertCanWriteTarget,
  AuthorizationError,
} from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import { updateTarget } from "@/actions/crm/targets/update-target";
import { deleteTarget } from "@/actions/crm/targets/delete-target";
import { convertTargetToDeal } from "@/actions/crm/targets/convert-target-to-deal";

const authed = requireAuthenticated as jest.Mock;
const assertTarget = assertCanWriteTarget as jest.Mock;
const tUpdate = prismadb.crm_Targets.update as jest.Mock;

const OWNER = { id: "owner", role: "user" };

beforeEach(() => {
  jest.clearAllMocks();
  authed.mockResolvedValue(OWNER);
  assertTarget.mockResolvedValue(undefined);
  mockConvertTarget.mockResolvedValue({ accountId: "a-1", contactId: "c-1" });
});

describe("updateTarget", () => {
  it("denies a non-owner and does not update", async () => {
    assertTarget.mockRejectedValue(new AuthorizationError());
    const res = await updateTarget({ id: "victim" } as any);
    expect(res).toEqual({ error: "Forbidden" });
    expect(assertTarget).toHaveBeenCalledWith(OWNER, "victim");
    expect(tUpdate).not.toHaveBeenCalled();
  });

  it("updates for an owner", async () => {
    await updateTarget({ id: "t-1" } as any);
    expect(assertTarget).toHaveBeenCalledWith(OWNER, "t-1");
    expect(tUpdate).toHaveBeenCalled();
  });
});

describe("deleteTarget", () => {
  it("denies a non-owner and does not soft-delete", async () => {
    assertTarget.mockRejectedValue(new AuthorizationError());
    const res = await deleteTarget("victim");
    expect(res).toEqual({ error: "Forbidden" });
    expect(tUpdate).not.toHaveBeenCalled();
  });

  it("soft-deletes for an owner", async () => {
    await deleteTarget("t-1");
    expect(assertTarget).toHaveBeenCalledWith(OWNER, "t-1");
    expect(tUpdate).toHaveBeenCalled();
  });
});

describe("convertTargetToDeal", () => {
  it("denies a non-owner before converting the target", async () => {
    assertTarget.mockRejectedValue(new AuthorizationError());
    const res = await convertTargetToDeal("victim");
    expect(res).toEqual({ error: "Forbidden" });
    expect(assertTarget).toHaveBeenCalledWith(OWNER, "victim");
    expect(mockConvertTarget).not.toHaveBeenCalled();
  });

  it("converts for an owner", async () => {
    const res = await convertTargetToDeal("t-1");
    expect(assertTarget).toHaveBeenCalledWith(OWNER, "t-1");
    expect(mockConvertTarget).toHaveBeenCalledWith("t-1");
    expect(res).toMatchObject({ opportunityId: "o-1" });
  });
});
