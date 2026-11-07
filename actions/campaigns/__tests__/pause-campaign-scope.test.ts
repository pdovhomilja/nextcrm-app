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
import { pauseCampaign } from "@/actions/campaigns/pause-campaign";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

describe("pauseCampaign scope", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prismadb.crm_campaigns.findUnique as jest.Mock).mockResolvedValue({ status: "sending", deletedAt: null });
  });

  it("unauthenticated returns Unauthorized, no update", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await pauseCampaign("c1");
    expect(res).toEqual({ error: "Unauthorized" });
    expect(prismadb.crm_campaigns.update).not.toHaveBeenCalled();
  });

  it("user out-of-scope: returns Not found, no update", async () => {
    mockUser("user", "u1");
    (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await pauseCampaign("c1");
    expect(res).toEqual({ error: "Not found" });
    expect(prismadb.crm_campaigns.update).not.toHaveBeenCalled();
  });

  it("user in-scope owner: pauses", async () => {
    mockUser("user", "u1");
    (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue({ id: "c1" });
    (prismadb.crm_campaigns.update as jest.Mock).mockResolvedValue({ id: "c1" });
    await pauseCampaign("c1");
    const call = (prismadb.crm_campaigns.update as jest.Mock).mock.calls[0][0];
    expect(call.data.status).toBe("paused");
  });

  it("manager: pauses", async () => {
    mockUser("manager", "m1");
    (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue({ id: "c1" });
    (prismadb.crm_campaigns.update as jest.Mock).mockResolvedValue({ id: "c1" });
    await pauseCampaign("c1");
    expect(prismadb.crm_campaigns.update).toHaveBeenCalledTimes(1);
  });

  it("in-scope pause cancels the campaign's sleeping jobs (campaigns/paused)", async () => {
    mockUser("user", "u1");
    (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue({ id: "c1" });
    (prismadb.crm_campaigns.update as jest.Mock).mockResolvedValue({ id: "c1" });
    await pauseCampaign("c1");
    expect(inngest.send).toHaveBeenCalledTimes(1);
    expect(inngest.send).toHaveBeenCalledWith({ name: "campaigns/paused", data: { campaignId: "c1" } });
  });

  it("out-of-scope or failed pause sends no campaigns/paused event", async () => {
    mockUser("user", "u1");
    (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue(null);
    await pauseCampaign("c1");
    (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue({ id: "c1" });
    (prismadb.crm_campaigns.update as jest.Mock).mockRejectedValue(new Error("db down"));
    await expect(pauseCampaign("c1")).rejects.toThrow("db down");
    expect(inngest.send).not.toHaveBeenCalled();
  });

  it.each(["draft", "sent", "paused", "deleted"])("refuses to pause a %s campaign: no update, no event", async (status) => {
    mockUser("user", "u1");
    (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue({ id: "c1" });
    (prismadb.crm_campaigns.findUnique as jest.Mock).mockResolvedValue({ status, deletedAt: null });
    const res = await pauseCampaign("c1");
    expect(res).toEqual({ error: "Only scheduled or sending campaigns can be paused" });
    expect(prismadb.crm_campaigns.update).not.toHaveBeenCalled();
    expect(inngest.send).not.toHaveBeenCalled();
  });

  it("refuses to pause a campaign with deletedAt set: no update, no event", async () => {
    mockUser("user", "u1");
    (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue({ id: "c1" });
    (prismadb.crm_campaigns.findUnique as jest.Mock).mockResolvedValue({ status: "sending", deletedAt: new Date("2026-11-01T00:00:00Z") });
    const res = await pauseCampaign("c1");
    expect(res).toEqual({ error: "Only scheduled or sending campaigns can be paused" });
    expect(prismadb.crm_campaigns.update).not.toHaveBeenCalled();
    expect(inngest.send).not.toHaveBeenCalled();
  });

  it.each(["scheduled", "sending"])("pauses a %s campaign and sends campaigns/paused", async (status) => {
    mockUser("user", "u1");
    (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue({ id: "c1" });
    (prismadb.crm_campaigns.findUnique as jest.Mock).mockResolvedValue({ status, deletedAt: null });
    (prismadb.crm_campaigns.update as jest.Mock).mockResolvedValue({ id: "c1", status: "paused" });
    const res = await pauseCampaign("c1");
    expect(res).toEqual({ id: "c1", status: "paused" });
    expect(prismadb.crm_campaigns.update).toHaveBeenCalledWith({ where: { id: "c1" }, data: { status: "paused" } });
    expect(inngest.send).toHaveBeenCalledWith({ name: "campaigns/paused", data: { campaignId: "c1" } });
  });
});
