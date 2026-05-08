jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Opportunities: { aggregate: jest.fn(), count: jest.fn(), findMany: jest.fn() },
    crm_Leads: { count: jest.fn() },
    crm_Contacts: { count: jest.fn() },
    crm_Accounts: { count: jest.fn() },
    crm_Contracts: { count: jest.fn() },
    crm_campaign_sends: { count: jest.fn() },
    tasks: { count: jest.fn() },
    users: { count: jest.fn() },
    exchangeRate: { findMany: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { getReportScope } from "@/lib/authz/scopes/report-scope";
import { getDashboardKPIs } from "@/actions/reports/dashboard";
import type { ReportFilters } from "@/actions/reports/types";

const baseFilters: ReportFilters = { dateFrom: new Date("2025-01-01"), dateTo: new Date("2025-12-31") };

describe("getDashboardKPIs", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prismadb.exchangeRate.findMany as jest.Mock).mockResolvedValue([]);
    (prismadb.crm_Opportunities.findMany as jest.Mock).mockResolvedValue([]);
  });

  it("returns all 10 KPIs", async () => {
    (prismadb.crm_Opportunities.aggregate as jest.Mock)
      .mockResolvedValueOnce({ _sum: { budget: BigInt(100000) } })
      .mockResolvedValueOnce({ _sum: { budget: BigInt(80000) } })
      .mockResolvedValueOnce({ _sum: { budget: BigInt(500000) } })
      .mockResolvedValueOnce({ _sum: { budget: BigInt(400000) } });
    (prismadb.crm_Leads.count as jest.Mock).mockResolvedValueOnce(50).mockResolvedValueOnce(40);
    (prismadb.crm_Opportunities.count as jest.Mock).mockResolvedValueOnce(25).mockResolvedValueOnce(20);
    (prismadb.crm_Contacts.count as jest.Mock).mockResolvedValueOnce(100).mockResolvedValueOnce(80);
    (prismadb.users.count as jest.Mock).mockResolvedValueOnce(30).mockResolvedValueOnce(25);
    (prismadb.tasks.count as jest.Mock).mockResolvedValueOnce(15).mockResolvedValueOnce(12).mockResolvedValueOnce(3).mockResolvedValueOnce(2);
    (prismadb.crm_campaign_sends.count as jest.Mock).mockResolvedValueOnce(200).mockResolvedValueOnce(150).mockResolvedValueOnce(80).mockResolvedValueOnce(60);
    (prismadb.crm_Accounts.count as jest.Mock).mockResolvedValueOnce(20).mockResolvedValueOnce(15);
    (prismadb.crm_Contracts.count as jest.Mock).mockResolvedValueOnce(5).mockResolvedValueOnce(3);

    const result = await getDashboardKPIs(baseFilters);

    expect(result).toHaveLength(10);
    expect(result[0].label).toBe("totalRevenue");
    expect(result[0].href).toBe("/reports/sales");
  });

  describe("scope application", () => {
    it("applies user scope to opportunity findMany calls", async () => {
      (prismadb.crm_Leads.count as jest.Mock).mockResolvedValue(0);
      (prismadb.crm_Opportunities.count as jest.Mock).mockResolvedValue(0);
      (prismadb.crm_Contacts.count as jest.Mock).mockResolvedValue(0);
      (prismadb.users.count as jest.Mock).mockResolvedValue(0);
      (prismadb.tasks.count as jest.Mock).mockResolvedValue(0);
      (prismadb.crm_campaign_sends.count as jest.Mock).mockResolvedValue(0);
      (prismadb.crm_Accounts.count as jest.Mock).mockResolvedValue(0);
      (prismadb.crm_Contracts.count as jest.Mock).mockResolvedValue(0);
      const scope = getReportScope({ id: "u8", role: "user" });
      await getDashboardKPIs(baseFilters, "EUR", scope);
      const arg = (prismadb.crm_Opportunities.findMany as jest.Mock).mock.calls[0][0];
      expect(arg.where.OR).toEqual(
        expect.arrayContaining([{ assigned_to: "u8" }, { createdBy: "u8" }]),
      );
      const leadArg = (prismadb.crm_Leads.count as jest.Mock).mock.calls[0][0];
      expect(leadArg.where.OR).toEqual(
        expect.arrayContaining([{ assigned_to: "u8" }, { createdBy: "u8" }]),
      );
    });
  });
});
