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
});
