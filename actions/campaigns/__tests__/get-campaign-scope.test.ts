jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_campaigns: { findFirst: jest.fn(), findUnique: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { getCampaign } from "@/actions/campaigns/get-campaign";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

describe("getCampaign scope", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unauthenticated returns null and does not query", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await getCampaign("c1");
    expect(res).toBeNull();
    expect(prismadb.crm_campaigns.findFirst).not.toHaveBeenCalled();
    expect(prismadb.crm_campaigns.findUnique).not.toHaveBeenCalled();
  });

  it("user out-of-scope: returns null (assert miss)", async () => {
    mockUser("user", "u1");
    (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await getCampaign("c1");
    expect(res).toBeNull();
    expect(prismadb.crm_campaigns.findFirst).toHaveBeenCalledTimes(1);
    expect(prismadb.crm_campaigns.findUnique).not.toHaveBeenCalled();
  });

  it("user in-scope: assert passes, returns detail", async () => {
    mockUser("user", "u1");
    (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue({ id: "c1" });
    const detail = { id: "c1", name: "Spring blast" };
    (prismadb.crm_campaigns.findUnique as jest.Mock).mockResolvedValue(detail);
    const res = await getCampaign("c1");
    expect(res).toEqual(detail);
    const assertCall = (prismadb.crm_campaigns.findFirst as jest.Mock).mock.calls[0][0];
    expect(assertCall.where.id).toBe("c1");
    expect(assertCall.where.created_by).toBe("u1");
    expect(assertCall.where.status).toEqual({ not: "deleted" });
  });

  it("manager: assert where has no created_by, detail returned", async () => {
    mockUser("manager", "m1");
    (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue({ id: "c1" });
    const detail = { id: "c1" };
    (prismadb.crm_campaigns.findUnique as jest.Mock).mockResolvedValue(detail);
    const res = await getCampaign("c1");
    expect(res).toEqual(detail);
    const assertCall = (prismadb.crm_campaigns.findFirst as jest.Mock).mock.calls[0][0];
    expect(assertCall.where.created_by).toBeUndefined();
    expect(assertCall.where.status).toEqual({ not: "deleted" });
  });
});
