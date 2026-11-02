jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_campaigns: { findMany: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { getCampaigns } from "@/actions/campaigns/get-campaigns";
import { CAMPAIGN_NOT_DELETED } from "@/lib/authz/scopes/campaign-not-deleted";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

describe("getCampaigns scope", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unauthenticated returns [] and does not query", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await getCampaigns();
    expect(res).toEqual([]);
    expect(prismadb.crm_campaigns.findMany).not.toHaveBeenCalled();
  });

  it("user role: where scoped by created_by and not deleted", async () => {
    mockUser("user", "u1");
    (prismadb.crm_campaigns.findMany as jest.Mock).mockResolvedValue([]);
    await getCampaigns();
    const call = (prismadb.crm_campaigns.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where.created_by).toBe("u1");
    expect(call.where.AND).toEqual([CAMPAIGN_NOT_DELETED]);
  });

  it("manager: where = not deleted only (no created_by)", async () => {
    mockUser("manager", "m1");
    (prismadb.crm_campaigns.findMany as jest.Mock).mockResolvedValue([]);
    await getCampaigns();
    const call = (prismadb.crm_campaigns.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where).toEqual({ AND: [CAMPAIGN_NOT_DELETED] });
    expect(call.where.created_by).toBeUndefined();
  });

  it("returns rows from findMany", async () => {
    mockUser("user", "u1");
    const rows = [{ id: "c1" }];
    (prismadb.crm_campaigns.findMany as jest.Mock).mockResolvedValue(rows);
    const res = await getCampaigns();
    expect(res).toEqual(rows);
  });
});
