jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
// Actions now resolve the caller via requireAuthenticated + assertCanWrite*;
// authz behavior is covered by the *-scope tests, so pass it through here.
jest.mock("@/lib/authz", () => ({
  requireAuthenticated: jest.fn(),
  assertCanWriteOpportunity: jest.fn(),
  AuthenticationError: class AuthenticationError extends Error {},
  AuthorizationError: class AuthorizationError extends Error {},
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Opportunities: { update: jest.fn(), findUnique: jest.fn() },
    crm_Opportunities_Sales_Stages: { findUnique: jest.fn() },
    users: { findFirst: jest.fn() },
  },
}));
jest.mock("@/lib/sendmail", () => ({ __esModule: true, default: jest.fn() }));
jest.mock("@/inngest/client", () => ({
  inngest: { send: jest.fn().mockResolvedValue({}) },
}));
jest.mock("@/lib/audit-log", () => ({
  writeAuditLog: jest.fn(),
  diffObjects: jest.fn(() => ({})),
}));
jest.mock("@/lib/currency", () => ({
  getDefaultCurrency: jest.fn().mockResolvedValue("CZK"),
  getSnapshotRate: jest.fn().mockResolvedValue(null),
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { requireAuthenticated, assertCanWriteOpportunity } from "@/lib/authz";
import { updateOpportunity } from "@/actions/crm/opportunities/update-opportunity";

describe("updateOpportunity currency handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSession as jest.Mock).mockResolvedValue({ user: { id: "u1" } });
    (requireAuthenticated as jest.Mock).mockResolvedValue({ id: "u1", role: "admin" });
    (assertCanWriteOpportunity as jest.Mock).mockResolvedValue(undefined);
    (prismadb.crm_Opportunities.findUnique as jest.Mock).mockResolvedValue({ id: "opp-1" });
    (prismadb.crm_Opportunities.update as jest.Mock).mockResolvedValue({ id: "opp-1" });
  });

  it("omits currency when the form sends an empty string (no-currency deal)", async () => {
    // The update form defaults null FK fields to "" — writing "" to the
    // Currency FK column fails; it must be dropped like the other FKs.
    await updateOpportunity({ id: "opp-1", name: "Deal", currency: "" } as any);
    const data = (prismadb.crm_Opportunities.update as jest.Mock).mock.calls[0][0].data;
    expect(data.currency).toBeUndefined();
  });

  it("passes currency through when set", async () => {
    await updateOpportunity({ id: "opp-1", name: "Deal", currency: "USD" } as any);
    const data = (prismadb.crm_Opportunities.update as jest.Mock).mock.calls[0][0].data;
    expect(data.currency).toBe("USD");
  });
});

describe("updateOpportunity approval gate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSession as jest.Mock).mockResolvedValue({ user: { id: "u1" } });
    (prismadb.crm_Opportunities.findUnique as jest.Mock).mockResolvedValue({
      id: "opp-1", sales_stage: "s-old", approval_status: "NONE",
    });
    (prismadb.crm_Opportunities.update as jest.Mock).mockResolvedValue({ id: "opp-1" });
  });

  it("blocks moving an unapproved deal into a qualified-kind stage", async () => {
    (prismadb.crm_Opportunities_Sales_Stages.findUnique as jest.Mock).mockResolvedValue({
      stage_kind: "qualified",
    });
    const res = await updateOpportunity({
      id: "opp-1", name: "Deal", sales_stage: "s-qualified",
    } as any);
    expect(res.error).toContain("approval");
    expect(prismadb.crm_Opportunities.update).not.toHaveBeenCalled();
  });

  it("allows the move when the deal is APPROVED", async () => {
    (prismadb.crm_Opportunities.findUnique as jest.Mock).mockResolvedValue({
      id: "opp-1", sales_stage: "s-old", approval_status: "APPROVED",
    });
    (prismadb.crm_Opportunities_Sales_Stages.findUnique as jest.Mock).mockResolvedValue({
      stage_kind: "qualified",
    });
    const res = await updateOpportunity({
      id: "opp-1", name: "Deal", sales_stage: "s-qualified",
    } as any);
    expect(res.error).toBeUndefined();
  });
});
