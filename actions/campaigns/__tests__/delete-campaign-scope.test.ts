jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_campaigns: { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  },
}));
jest.mock("@/inngest/client", () => ({ inngest: { send: jest.fn() } }));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { inngest } from "@/inngest/client";
import { deleteCampaign } from "@/actions/campaigns/delete-campaign";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

describe("deleteCampaign scope", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unauthenticated returns Unauthorized, no update", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await deleteCampaign("c1");
    expect(res).toEqual({ error: "Unauthorized" });
    expect(prismadb.crm_campaigns.update).not.toHaveBeenCalled();
    expect(inngest.send).not.toHaveBeenCalled();
  });

  it("user out-of-scope: returns Not found, no update", async () => {
    mockUser("user", "u1");
    (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await deleteCampaign("c1");
    expect(res).toEqual({ error: "Not found" });
    expect(prismadb.crm_campaigns.update).not.toHaveBeenCalled();
    expect(inngest.send).not.toHaveBeenCalled();
  });

  it("user in-scope owner: soft-deletes", async () => {
    mockUser("user", "u1");
    (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue({ id: "c1" });
    (prismadb.crm_campaigns.update as jest.Mock).mockResolvedValue({ id: "c1" });
    await deleteCampaign("c1");
    const call = (prismadb.crm_campaigns.update as jest.Mock).mock.calls[0][0];
    expect(call.data.status).toBe("deleted");
  });

  it("manager: soft-deletes", async () => {
    mockUser("manager", "m1");
    (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue({ id: "c1" });
    (prismadb.crm_campaigns.update as jest.Mock).mockResolvedValue({ id: "c1" });
    await deleteCampaign("c1");
    expect(prismadb.crm_campaigns.update).toHaveBeenCalledTimes(1);
  });

  it("in-scope delete cancels the campaign's sleeping jobs (campaigns/deleted)", async () => {
    mockUser("user", "u1");
    (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue({ id: "c1" });
    (prismadb.crm_campaigns.update as jest.Mock).mockResolvedValue({ id: "c1" });
    await deleteCampaign("c1");
    expect(inngest.send).toHaveBeenCalledTimes(1);
    expect(inngest.send).toHaveBeenCalledWith({ name: "campaigns/deleted", data: { campaignId: "c1" } });
  });

  it("failed soft delete sends no campaigns/deleted event", async () => {
    mockUser("user", "u1");
    (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue({ id: "c1" });
    (prismadb.crm_campaigns.update as jest.Mock).mockRejectedValue(new Error("db down"));
    await expect(deleteCampaign("c1")).rejects.toThrow("db down");
    expect(inngest.send).not.toHaveBeenCalled();
  });

  it("a sending campaign is refused: error, no update, no campaigns/deleted", async () => {
    mockUser("user", "u1");
    (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue({ id: "c1" });
    (prismadb.crm_campaigns.findUnique as jest.Mock).mockResolvedValue({ status: "sending" });
    const res = await deleteCampaign("c1");
    expect(res).toEqual({ error: "Cannot delete a campaign that is currently sending" });
    expect(prismadb.crm_campaigns.update).not.toHaveBeenCalled();
    expect(inngest.send).not.toHaveBeenCalled();
  });
});
