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
import { scheduleCampaign } from "@/actions/campaigns/schedule-campaign";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

describe("scheduleCampaign scope", () => {
  beforeEach(() => jest.clearAllMocks());

  const when = new Date("2026-06-01T00:00:00Z");

  it("unauthenticated returns Unauthorized, no update / no inngest", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await scheduleCampaign("c1", when);
    expect(res).toEqual({ error: "Unauthorized" });
    expect(prismadb.crm_campaigns.update).not.toHaveBeenCalled();
    expect(inngest.send).not.toHaveBeenCalled();
  });

  it("user role returns Forbidden, no update / no inngest", async () => {
    mockUser("user", "u1");
    const res = await scheduleCampaign("c1", when);
    expect(res).toEqual({ error: "Forbidden" });
    expect(prismadb.crm_campaigns.update).not.toHaveBeenCalled();
    expect(inngest.send).not.toHaveBeenCalled();
  });

  it("manager: schedules and emits inngest event", async () => {
    mockUser("manager", "m1");
    (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue({ id: "c1" });
    (prismadb.crm_campaigns.update as jest.Mock).mockResolvedValue({ id: "c1" });
    await scheduleCampaign("c1", when);
    expect(prismadb.crm_campaigns.findFirst).toHaveBeenCalled();
    const call = (prismadb.crm_campaigns.update as jest.Mock).mock.calls[0][0];
    expect(call.data.status).toBe("scheduled");
    expect(call.data.scheduled_at).toBe(when);
    expect(inngest.send).toHaveBeenCalledWith({
      name: "campaigns/schedule",
      data: { campaignId: "c1", scheduledAt: when.toISOString() },
    });
  });

  it("admin: schedules and emits inngest event", async () => {
    mockUser("admin", "a1");
    (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue({ id: "c1" });
    (prismadb.crm_campaigns.update as jest.Mock).mockResolvedValue({ id: "c1" });
    await scheduleCampaign("c1", when);
    expect(prismadb.crm_campaigns.update).toHaveBeenCalledTimes(1);
    expect(inngest.send).toHaveBeenCalledTimes(1);
  });
});
