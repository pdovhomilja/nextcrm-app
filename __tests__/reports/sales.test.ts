jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Opportunities: {
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
  },
}));

import { prismadb } from "@/lib/prisma";
import {
  getRevenue,
  getPipelineValue,
  getOppsByStage,
  getOppsByMonth,
  getWinLossRate,
  getAvgDealSize,
  getSalesCycleLength,
} from "@/actions/reports/sales";
import type { ReportFilters } from "@/actions/reports/types";

const baseFilters: ReportFilters = {
  dateFrom: new Date("2025-01-01"),
  dateTo: new Date("2025-12-31"),
};

describe("sales report actions", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("getRevenue", () => {
    it("sums budget of won opportunities in date range", async () => {
      (prismadb.crm_Opportunities.aggregate as jest.Mock).mockResolvedValue({
        _sum: { budget: BigInt(150000) },
      });
      const result = await getRevenue(baseFilters);
      expect(prismadb.crm_Opportunities.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: "CLOSED", deletedAt: null }),
          _sum: { budget: true },
        })
      );
      expect(result).toBe(150000);
    });

    it("returns 0 when no won opportunities", async () => {
      (prismadb.crm_Opportunities.aggregate as jest.Mock).mockResolvedValue({
        _sum: { budget: null },
      });
      const result = await getRevenue(baseFilters);
      expect(result).toBe(0);
    });
  });

  describe("getPipelineValue", () => {
    it("sums budget of active opportunities", async () => {
      (prismadb.crm_Opportunities.aggregate as jest.Mock).mockResolvedValue({
        _sum: { budget: BigInt(500000) },
      });
      const result = await getPipelineValue(baseFilters);
      expect(result).toBe(500000);
    });
  });

  describe("getOppsByStage", () => {
    it("groups opportunities by sales stage name", async () => {
      (prismadb.crm_Opportunities.findMany as jest.Mock).mockResolvedValue([
        { assigned_sales_stage: { name: "Prospecting" } },
        { assigned_sales_stage: { name: "Prospecting" } },
        { assigned_sales_stage: { name: "Closed Won" } },
      ]);
      const result = await getOppsByStage(baseFilters);
      expect(result).toEqual([
        { name: "Prospecting", Number: 2 },
        { name: "Closed Won", Number: 1 },
      ]);
    });
  });

  describe("getOppsByMonth", () => {
    it("groups opportunities by creation month", async () => {
      (prismadb.crm_Opportunities.findMany as jest.Mock).mockResolvedValue([
        { created_on: new Date("2025-01-15") },
        { created_on: new Date("2025-01-20") },
        { created_on: new Date("2025-02-10") },
      ]);
      const result = await getOppsByMonth(baseFilters);
      expect(result).toEqual([
        { name: "2025-01", Number: 2 },
        { name: "2025-02", Number: 1 },
      ]);
    });
  });

  describe("getWinLossRate", () => {
    it("calculates win/loss counts", async () => {
      (prismadb.crm_Opportunities.count as jest.Mock)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(5);
      const result = await getWinLossRate(baseFilters);
      expect(result).toEqual({ won: 10, total: 5, rate: 200 });
    });
  });

  describe("getAvgDealSize", () => {
    it("returns average budget of closed opportunities", async () => {
      (prismadb.crm_Opportunities.aggregate as jest.Mock).mockResolvedValue({
        _avg: { budget: 75000 },
      });
      const result = await getAvgDealSize(baseFilters);
      expect(result).toBe(75000);
    });
  });
});
