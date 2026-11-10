// Object-level authorization regression tests for opportunity write actions
// (GHSA-qwhm-9fcm-p878). Denial tests must fail against the pre-guard code.

jest.mock("@/lib/authz", () => ({
  PARTNER_EDIT: { partnerEdit: true },
  requireAuthenticated: jest.fn(),
  assertCanWriteOpportunity: jest.fn(),
  assertCanWriteAccount: jest.fn(),
  assertCanReadCampaign: jest.fn(),
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
  assertCanReadCampaign,
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
const assertCampaign = assertCanReadCampaign as jest.Mock;
const oFind = prismadb.crm_Opportunities.findUnique as jest.Mock;

const OWNER = { id: "owner", role: "user" };

beforeEach(() => {
  jest.clearAllMocks();
  authed.mockResolvedValue(OWNER);
  assertOpp.mockResolvedValue(undefined);
  assertAccount.mockResolvedValue(undefined);
  assertCampaign.mockResolvedValue(undefined);
  oFind.mockResolvedValue({ id: "o-1", sales_stage: null, approval_status: "NONE", campaign: "stored-camp", account: "stored-acc" });
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
    expect(assertOpp).toHaveBeenCalledWith(OWNER, "o-1", { partnerEdit: true });
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
    expect(assertAccount).toHaveBeenCalledWith(OWNER, "foreign-acc", { partnerEdit: true });
    expect(oCreate).not.toHaveBeenCalled();
  });

  it("plain create (no linked account) needs only authentication", async () => {
    await createOpportunity({ name: "X" } as any);
    expect(assertAccount).not.toHaveBeenCalled();
    expect(oCreate).toHaveBeenCalled();
  });
});

describe("createOpportunity campaign", () => {
  it("links a campaign the user may read", async () => {
    await createOpportunity({ name: "X", campaign: "own-camp" } as any);
    expect(assertCampaign).toHaveBeenCalledWith(OWNER, "own-camp");
    expect(oCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ campaign: "own-camp" }) }),
    );
  });

  it("refuses a campaign outside the user's read scope and does not create", async () => {
    assertCampaign.mockRejectedValue(new AuthorizationError());
    const res = await createOpportunity({ name: "X", campaign: "foreign-camp" } as any);
    expect(res).toEqual({ error: "Forbidden" });
    expect(oCreate).not.toHaveBeenCalled();
  });
});

describe("updateOpportunity campaign", () => {
  const PARTNER = { id: "partner", role: "partner" };

  it("refuses a change to a campaign outside the user's read scope and does not update", async () => {
    assertCampaign.mockRejectedValue(new AuthorizationError());
    const res = await updateOpportunity({ id: "o-1", campaign: "foreign-camp" } as any);
    expect(res).toEqual({ error: "Forbidden" });
    expect(assertCampaign).toHaveBeenCalledWith(OWNER, "foreign-camp");
    expect(oUpdate).not.toHaveBeenCalled();
  });

  it("saves when the form re-sends the stored campaign, even one outside the user's scope", async () => {
    assertCampaign.mockRejectedValue(new AuthorizationError());
    const res = await updateOpportunity({ id: "o-1", name: "New", campaign: "stored-camp" } as any);
    expect(res).not.toHaveProperty("error");
    expect(assertCampaign).not.toHaveBeenCalled();
    expect(oUpdate).toHaveBeenCalled();
  });

  it("does not check a campaign when none is sent", async () => {
    await updateOpportunity({ id: "o-1", name: "New" } as any);
    expect(assertCampaign).not.toHaveBeenCalled();
    expect(oUpdate).toHaveBeenCalled();
  });

  it("partner: a new campaign is checked and refused, the stored one still saves", async () => {
    authed.mockResolvedValue(PARTNER);
    assertCampaign.mockRejectedValue(new AuthorizationError());
    expect(await updateOpportunity({ id: "o-1", campaign: "other-camp" } as any)).toEqual({ error: "Forbidden" });
    expect(assertCampaign).toHaveBeenCalledWith(PARTNER, "other-camp");
    expect(oUpdate).not.toHaveBeenCalled();

    assertCampaign.mockClear();
    const res = await updateOpportunity({ id: "o-1", name: "New", campaign: "stored-camp" } as any);
    expect(res).not.toHaveProperty("error");
    expect(assertCampaign).not.toHaveBeenCalled();
    expect(oUpdate).toHaveBeenCalled();
  });
});

describe("updateOpportunity account", () => {
  const PARTNER = { id: "partner", role: "partner" };

  it("refuses a move to an account outside the user's write scope and does not update", async () => {
    assertAccount.mockRejectedValue(new AuthorizationError());
    const res = await updateOpportunity({ id: "o-1", account: "foreign-acc" } as any);
    expect(res).toEqual({ error: "Forbidden" });
    expect(assertAccount).toHaveBeenCalledWith(OWNER, "foreign-acc", { partnerEdit: true });
    expect(oUpdate).not.toHaveBeenCalled();
  });

  it("saves when the form re-sends the stored account, even one outside the user's scope", async () => {
    assertAccount.mockRejectedValue(new AuthorizationError());
    const res = await updateOpportunity({ id: "o-1", name: "New", account: "stored-acc" } as any);
    expect(res).not.toHaveProperty("error");
    expect(assertAccount).not.toHaveBeenCalled();
    expect(oUpdate).toHaveBeenCalled();
  });

  it("does not check an account when none is sent", async () => {
    await updateOpportunity({ id: "o-1", name: "New" } as any);
    expect(assertAccount).not.toHaveBeenCalled();
    expect(oUpdate).toHaveBeenCalled();
  });

  it("partner: a new account is checked and refused, the stored one still saves", async () => {
    authed.mockResolvedValue(PARTNER);
    assertAccount.mockRejectedValue(new AuthorizationError());
    expect(await updateOpportunity({ id: "o-1", account: "other-acc" } as any)).toEqual({ error: "Forbidden" });
    expect(assertAccount).toHaveBeenCalledWith(PARTNER, "other-acc", { partnerEdit: true });
    expect(oUpdate).not.toHaveBeenCalled();

    assertAccount.mockClear();
    const res = await updateOpportunity({ id: "o-1", name: "New", account: "stored-acc" } as any);
    expect(res).not.toHaveProperty("error");
    expect(assertAccount).not.toHaveBeenCalled();
    expect(oUpdate).toHaveBeenCalled();
  });
});
