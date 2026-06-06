import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_campaigns: {
      findMany: vi.fn(),
    },
  },
}));

import { getCampaigns } from "@/actions/crm/get-campaigns";
import { prismadb } from "@/lib/prisma";

describe("getCampaigns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns all campaigns", async () => {
    const campaigns = [
      { id: "c1", name: "Campaign 1" },
      { id: "c2", name: "Campaign 2" },
    ];
    (prismadb.crm_campaigns.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(campaigns);
    const res = await getCampaigns();
    expect(res).toEqual(campaigns);
    expect(prismadb.crm_campaigns.findMany).toHaveBeenCalledWith({});
  });

  it("returns empty array when no campaigns", async () => {
    (prismadb.crm_campaigns.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const res = await getCampaigns();
    expect(res).toEqual([]);
  });
});
