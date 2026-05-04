jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_campaigns: { findFirst: jest.fn(), update: jest.fn() },
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
  beforeEach(() => jest.clearAllMocks());

  it("unauthenticated returns Unauthorized, no update / no inngest", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await sendCampaignNow("c1");
    expect(res).toEqual({ error: "Unauthorized" });
    expect(prismadb.crm_campaigns.update).not.toHaveBeenCalled();
    expect(inngest.send).not.toHaveBeenCalled();
  });

  it("user role returns Forbidden, no update / no inngest", async () => {
    mockUser("user", "u1");
    const res = await sendCampaignNow("c1");
    expect(res).toEqual({ error: "Forbidden" });
    expect(prismadb.crm_campaigns.update).not.toHaveBeenCalled();
    expect(inngest.send).not.toHaveBeenCalled();
  });

  it("manager: sends and emits inngest event", async () => {
    mockUser("manager", "m1");
    (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue({ id: "c1" });
    (prismadb.crm_campaigns.update as jest.Mock).mockResolvedValue({ id: "c1" });
    await sendCampaignNow("c1");
    expect(prismadb.crm_campaigns.findFirst).toHaveBeenCalled();
    const call = (prismadb.crm_campaigns.update as jest.Mock).mock.calls[0][0];
    expect(call.data.status).toBe("sending");
    expect(inngest.send).toHaveBeenCalledWith({
      name: "campaigns/send-now",
      data: { campaignId: "c1" },
    });
  });

  it("admin: sends and emits inngest event", async () => {
    mockUser("admin", "a1");
    (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue({ id: "c1" });
    (prismadb.crm_campaigns.update as jest.Mock).mockResolvedValue({ id: "c1" });
    await sendCampaignNow("c1");
    expect(prismadb.crm_campaigns.update).toHaveBeenCalledTimes(1);
    expect(inngest.send).toHaveBeenCalledTimes(1);
  });
});
