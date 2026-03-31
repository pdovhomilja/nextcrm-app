jest.mock("@/lib/prisma", () => ({
  prismadb: { crm_Accounts: { findMany: jest.fn() } },
}));

import { prismadb } from "@/lib/prisma";
import { getNewAccounts, getAccountsByIndustry, getTopAccountsByRevenue, getAccountsBySize } from "@/actions/reports/accounts";
import type { ReportFilters } from "@/actions/reports/types";

const baseFilters: ReportFilters = { dateFrom: new Date("2025-01-01"), dateTo: new Date("2025-12-31") };

describe("accounts report actions", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("getNewAccounts", () => {
    it("groups accounts by creation month", async () => {
      (prismadb.crm_Accounts.findMany as jest.Mock).mockResolvedValue([
        { createdAt: new Date("2025-01-10") },
        { createdAt: new Date("2025-01-20") },
        { createdAt: new Date("2025-02-15") },
      ]);
      const result = await getNewAccounts(baseFilters);
      expect(result).toEqual([{ name: "2025-01", Number: 2 }, { name: "2025-02", Number: 1 }]);
    });
  });

  describe("getAccountsByIndustry", () => {
    it("groups accounts by industry type name", async () => {
      (prismadb.crm_Accounts.findMany as jest.Mock).mockResolvedValue([
        { industry_type: { name: "Technology" } },
        { industry_type: { name: "Technology" } },
        { industry_type: { name: "Healthcare" } },
        { industry_type: null },
      ]);
      const result = await getAccountsByIndustry(baseFilters);
      expect(result).toEqual([
        { name: "Technology", Number: 2 },
        { name: "Healthcare", Number: 1 },
        { name: "Unknown", Number: 1 },
      ]);
    });
  });

  describe("getTopAccountsByRevenue", () => {
    it("returns top accounts sorted by annual revenue", async () => {
      (prismadb.crm_Accounts.findMany as jest.Mock).mockResolvedValue([
        { name: "Big Corp", annual_revenue: "1000000" },
        { name: "Small LLC", annual_revenue: "50000" },
      ]);
      const result = await getTopAccountsByRevenue(baseFilters);
      expect(result).toEqual([
        { name: "Big Corp", Number: 1000000 },
        { name: "Small LLC", Number: 50000 },
      ]);
    });
  });

  describe("getAccountsBySize", () => {
    it("groups accounts by employee count ranges", async () => {
      (prismadb.crm_Accounts.findMany as jest.Mock).mockResolvedValue([
        { employees: "5" },
        { employees: "50" },
        { employees: "500" },
        { employees: null },
      ]);
      const result = await getAccountsBySize(baseFilters);
      expect(result).toContainEqual(expect.objectContaining({ name: "1-10" }));
      expect(result).toContainEqual(expect.objectContaining({ name: "11-50" }));
    });
  });
});
