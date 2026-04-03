jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_campaigns: { findMany: jest.fn() },
    crm_campaign_sends: { count: jest.fn() },
    crm_TargetLists: { findMany: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { getCampaignPerformance, getTopTemplates, getTargetListGrowth } from "@/actions/reports/campaigns";
import type { ReportFilters } from "@/actions/reports/types";

const baseFilters: ReportFilters = { dateFrom: new Date("2025-01-01"), dateTo: new Date("2025-12-31") };

describe("campaigns report actions", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("getCampaignPerformance", () => {
    it("returns sent, opened, and clicked counts", async () => {
      (prismadb.crm_campaign_sends.count as jest.Mock)
        .mockResolvedValueOnce(100).mockResolvedValueOnce(40).mockResolvedValueOnce(15);
      const result = await getCampaignPerformance(baseFilters);
      expect(result).toEqual({ sent: 100, opened: 40, clicked: 15, openRate: 40, clickRate: 15 });
    });

    it("returns 0 rates when no sends", async () => {
      (prismadb.crm_campaign_sends.count as jest.Mock)
        .mockResolvedValueOnce(0).mockResolvedValueOnce(0).mockResolvedValueOnce(0);
      const result = await getCampaignPerformance(baseFilters);
      expect(result.openRate).toBe(0);
      expect(result.clickRate).toBe(0);
    });
  });

  describe("getTopTemplates", () => {
    it("returns templates sorted by usage count", async () => {
      (prismadb.crm_campaigns.findMany as jest.Mock).mockResolvedValue([
        { template: { name: "Welcome" }, _count: { sends: 50 } },
        { template: { name: "Follow-up" }, _count: { sends: 30 } },
      ]);
      const result = await getTopTemplates(baseFilters);
      expect(result).toEqual([{ name: "Welcome", Number: 50 }, { name: "Follow-up", Number: 30 }]);
    });
  });

  describe("getTargetListGrowth", () => {
    it("groups target lists by creation month", async () => {
      (prismadb.crm_TargetLists.findMany as jest.Mock).mockResolvedValue([
        { created_on: new Date("2025-01-10"), _count: { targets: 50 } },
        { created_on: new Date("2025-02-15"), _count: { targets: 30 } },
      ]);
      const result = await getTargetListGrowth(baseFilters);
      expect(result).toEqual([{ name: "2025-01", Number: 50 }, { name: "2025-02", Number: 30 }]);
    });
  });
});
