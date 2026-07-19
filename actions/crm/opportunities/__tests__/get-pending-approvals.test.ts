jest.mock("@/lib/authz", () => ({
  requireRole: jest.fn(),
  AuthenticationError: class AuthenticationError extends Error {},
  AuthorizationError: class AuthorizationError extends Error {},
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: { crm_Opportunities: { findMany: jest.fn() } },
}));

import { prismadb } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { getPendingApprovals } from "@/actions/crm/opportunities/get-pending-approvals";

describe("getPendingApprovals", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireRole as jest.Mock).mockResolvedValue({ id: "cso1", role: "manager" });
  });

  it("lists PENDING deals with serialized decimals, oldest request first", async () => {
    (prismadb.crm_Opportunities.findMany as jest.Mock).mockResolvedValue([
      {
        id: "o1", name: "Deal", approval_requested_at: new Date("2026-07-01"),
        budget: { toNumber: () => 1000 }, expected_revenue: { toNumber: () => 800 },
        assigned_account: { name: "Acme" }, assigned_to_user: { name: "Rep" },
      },
    ]);
    const res = await getPendingApprovals();
    expect(Array.isArray(res)).toBe(true);
    const rows = res as any[];
    expect(rows[0]).toMatchObject({
      id: "o1", accountName: "Acme", repName: "Rep", budget: 1000,
    });
    const where = (prismadb.crm_Opportunities.findMany as jest.Mock).mock.calls[0][0].where;
    expect(where.approval_status).toBe("PENDING");
    expect(where.deletedAt).toBeNull();
  });

  it("returns error for non-managers", async () => {
    const { AuthorizationError } = jest.requireMock("@/lib/authz");
    (requireRole as jest.Mock).mockRejectedValue(new AuthorizationError());
    const res = await getPendingApprovals();
    expect((res as any).error).toBeDefined();
  });
});
