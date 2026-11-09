jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_campaigns: { findFirst: jest.fn(), findUnique: jest.fn(), updateMany: jest.fn() },
    crm_campaign_steps: { findFirst: jest.fn() },
  },
}));
jest.mock("@/inngest/client", () => ({
  inngest: { send: jest.fn().mockResolvedValue({}) },
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { inngest } from "@/inngest/client";
import { sendCampaignNow } from "@/actions/campaigns/send-campaign-now";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

describe("sendCampaignNow scope", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // c1 has a step 0; anything else (another campaign, another order) has none.
    (prismadb.crm_campaign_steps.findFirst as jest.Mock).mockImplementation(async ({ where }) =>
      where.campaign_id === "c1" && where.order === 0 ? { id: "s0" } : null
    );
  });

  it("unauthenticated returns Unauthorized, no update / no inngest", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await sendCampaignNow("c1");
    expect(res).toEqual({ error: "Unauthorized" });
    expect(prismadb.crm_campaigns.updateMany).not.toHaveBeenCalled();
    expect(inngest.send).not.toHaveBeenCalled();
  });

  it("user role returns Forbidden, no update / no inngest", async () => {
    mockUser("user", "u1");
    const res = await sendCampaignNow("c1");
    expect(res).toEqual({ error: "Forbidden" });
    expect(prismadb.crm_campaigns.updateMany).not.toHaveBeenCalled();
    expect(inngest.send).not.toHaveBeenCalled();
  });

  it("out of scope: Not found, status not revealed, no update / no inngest", async () => {
    mockUser("manager", "m1");
    (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue(null);
    (prismadb.crm_campaigns.findUnique as jest.Mock).mockResolvedValue({ status: "sent" });
    const res = await sendCampaignNow("c1");
    expect(res).toEqual({ error: "Not found" });
    expect(prismadb.crm_campaigns.updateMany).not.toHaveBeenCalled();
    expect(inngest.send).not.toHaveBeenCalled();
  });

  it("no step 0: refused, no update / no inngest", async () => {
    mockUser("manager", "m1");
    (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue({ id: "c2" });
    (prismadb.crm_campaigns.findUnique as jest.Mock).mockResolvedValue({ status: "draft" });
    const res = await sendCampaignNow("c2");
    expect(res).toEqual({ error: "Campaign has no first step (step 0)" });
    expect(prismadb.crm_campaigns.updateMany).not.toHaveBeenCalled();
    expect(inngest.send).not.toHaveBeenCalled();
  });

  it("manager: sends and emits inngest event", async () => {
    mockUser("manager", "m1");
    (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue({ id: "c1" });
    (prismadb.crm_campaigns.findUnique as jest.Mock).mockResolvedValue({ status: "draft" });
    (prismadb.crm_campaigns.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    await sendCampaignNow("c1");
    expect(prismadb.crm_campaigns.findFirst).toHaveBeenCalled();
    const call = (prismadb.crm_campaigns.updateMany as jest.Mock).mock.calls[0][0];
    expect(call.data.status).toBe("sending");
    expect(call.where).toEqual({ id: "c1", status: { in: ["draft", "scheduled"] } });
    expect(inngest.send).toHaveBeenCalledWith({
      name: "campaigns/send-now",
      data: { campaignId: "c1" },
    });
  });

  it("admin: sends and emits inngest event", async () => {
    mockUser("admin", "a1");
    (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue({ id: "c1" });
    (prismadb.crm_campaigns.findUnique as jest.Mock).mockResolvedValue({ status: "draft" });
    (prismadb.crm_campaigns.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    await sendCampaignNow("c1");
    expect(prismadb.crm_campaigns.updateMany).toHaveBeenCalledTimes(1);
    expect(inngest.send).toHaveBeenCalledTimes(1);
  });

  it.each(["draft", "scheduled"])("%s campaign: sends and emits inngest event", async (status) => {
    mockUser("manager", "m1");
    (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue({ id: "c1" });
    (prismadb.crm_campaigns.findUnique as jest.Mock).mockResolvedValue({ status });
    (prismadb.crm_campaigns.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    const res = await sendCampaignNow("c1");
    expect(res).toBeUndefined();
    expect((prismadb.crm_campaigns.updateMany as jest.Mock).mock.calls[0][0].data.status).toBe("sending");
    expect(inngest.send).toHaveBeenCalledWith({
      name: "campaigns/send-now",
      data: { campaignId: "c1" },
    });
  });

  it("a call that loses the status write gets the refusal, no inngest", async () => {
    mockUser("manager", "m1");
    (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue({ id: "c1" });
    (prismadb.crm_campaigns.findUnique as jest.Mock).mockResolvedValue({ status: "draft" });
    (prismadb.crm_campaigns.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
    const res = await sendCampaignNow("c1");
    expect(res).toEqual({ error: "Cannot send campaign in status: sending" });
    expect(inngest.send).not.toHaveBeenCalled();
  });

  it.each(["sent", "sending", "paused", "deleted", null])(
    "%s campaign: refused, no update / no inngest",
    async (status) => {
      mockUser("manager", "m1");
      (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue({ id: "c1" });
      (prismadb.crm_campaigns.findUnique as jest.Mock).mockResolvedValue({ status });
      const res = await sendCampaignNow("c1");
      expect(res).toEqual({ error: `Cannot send campaign in status: ${status}` });
      expect(prismadb.crm_campaigns.updateMany).not.toHaveBeenCalled();
      expect(inngest.send).not.toHaveBeenCalled();
    }
  );
});
