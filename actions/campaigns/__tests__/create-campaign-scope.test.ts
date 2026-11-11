jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_campaigns: { create: jest.fn() },
    crm_campaign_templates: { findFirst: jest.fn() },
    crm_TargetLists: { findMany: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { createCampaign } from "@/actions/campaigns/create-campaign";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

const baseInput = {
  name: "C1",
  target_list_ids: [] as string[],
  steps: [] as any[],
};

describe("createCampaign scope", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unauthenticated returns Unauthorized error and never writes", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await createCampaign({ ...baseInput });
    expect(res).toEqual({ error: "Unauthorized" });
    expect(prismadb.crm_campaigns.create).not.toHaveBeenCalled();
  });

  it("user creates campaign with created_by = user.id", async () => {
    mockUser("user", "u1");
    (prismadb.crm_campaigns.create as jest.Mock).mockResolvedValue({ id: "c1" });
    await createCampaign({ ...baseInput });
    expect(prismadb.crm_campaigns.create).toHaveBeenCalledTimes(1);
    const call = (prismadb.crm_campaigns.create as jest.Mock).mock.calls[0][0];
    expect(call.data.created_by).toBe("u1");
    expect(call.data.created_by).not.toBeNull();
  });

  it("manager creates campaign successfully", async () => {
    mockUser("manager", "m1");
    (prismadb.crm_campaigns.create as jest.Mock).mockResolvedValue({ id: "c2" });
    await createCampaign({ ...baseInput });
    const call = (prismadb.crm_campaigns.create as jest.Mock).mock.calls[0][0];
    expect(call.data.created_by).toBe("m1");
  });

  it("user references unreadable template_id returns Forbidden, no write", async () => {
    mockUser("user", "u1");
    (prismadb.crm_campaign_templates.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await createCampaign({ ...baseInput, template_id: "t1" });
    expect(res).toEqual({ error: "Forbidden" });
    expect(prismadb.crm_campaigns.create).not.toHaveBeenCalled();
  });

  it("user references unreadable target_list_ids returns Forbidden, no write", async () => {
    mockUser("user", "u1");
    (prismadb.crm_TargetLists.findMany as jest.Mock).mockResolvedValue([{ id: "tl1" }]);
    const res = await createCampaign({
      ...baseInput,
      target_list_ids: ["tl1", "tl2"],
    });
    expect(res).toEqual({ error: "Forbidden" });
    expect(prismadb.crm_campaigns.create).not.toHaveBeenCalled();
  });

  const step = (order: number) => ({ order, template_id: "t1", subject: "S", delay_days: order, send_to: "all" as const });

  it("refuses a scheduled campaign without step 0, no write", async () => {
    mockUser("manager", "m1");
    (prismadb.crm_campaign_templates.findFirst as jest.Mock).mockResolvedValue({ id: "t1" });
    const res = await createCampaign({ ...baseInput, steps: [step(1)], scheduled_at: new Date("2030-01-01") });
    expect(res).toEqual({ error: "Campaign has no first step (step 0)" });
    expect(prismadb.crm_campaigns.create).not.toHaveBeenCalled();
  });

  // What the wizard sends: step 0 plus follow-ups, with a date.
  it("creates a scheduled campaign that has step 0", async () => {
    mockUser("manager", "m1");
    (prismadb.crm_campaign_templates.findFirst as jest.Mock).mockResolvedValue({ id: "t1" });
    (prismadb.crm_campaigns.create as jest.Mock).mockResolvedValue({ id: "c3" });
    await createCampaign({ ...baseInput, steps: [step(0), step(1)], scheduled_at: new Date("2030-01-01") });
    const call = (prismadb.crm_campaigns.create as jest.Mock).mock.calls[0][0];
    expect(call.data.status).toBe("scheduled");
    expect(call.data.steps.create).toHaveLength(2);
  });

  it("still creates a draft without step 0", async () => {
    mockUser("manager", "m1");
    (prismadb.crm_campaign_templates.findFirst as jest.Mock).mockResolvedValue({ id: "t1" });
    (prismadb.crm_campaigns.create as jest.Mock).mockResolvedValue({ id: "c4" });
    await createCampaign({ ...baseInput, steps: [step(1)] });
    const call = (prismadb.crm_campaigns.create as jest.Mock).mock.calls[0][0];
    expect(call.data.status).toBe("draft");
  });
});
