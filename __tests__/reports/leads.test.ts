jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Leads: { findMany: jest.fn(), count: jest.fn() },
    crm_Contacts: { findMany: jest.fn(), count: jest.fn() },
    crm_Opportunities: { count: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { getNewLeads, getLeadSources, getConversionRate, getNewContacts, getContactsByAccount } from "@/actions/reports/leads";
import type { ReportFilters } from "@/actions/reports/types";

const baseFilters: ReportFilters = { dateFrom: new Date("2025-01-01"), dateTo: new Date("2025-12-31") };

describe("leads report actions", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("getNewLeads", () => {
    it("groups leads by creation month", async () => {
      (prismadb.crm_Leads.findMany as jest.Mock).mockResolvedValue([
        { createdAt: new Date("2025-01-15") },
        { createdAt: new Date("2025-01-20") },
        { createdAt: new Date("2025-03-10") },
      ]);
      const result = await getNewLeads(baseFilters);
      expect(result).toEqual([{ name: "2025-01", Number: 2 }, { name: "2025-03", Number: 1 }]);
    });
  });

  describe("getLeadSources", () => {
    it("groups leads by source name", async () => {
      (prismadb.crm_Leads.findMany as jest.Mock).mockResolvedValue([
        { lead_source: { name: "Website" } },
        { lead_source: { name: "Website" } },
        { lead_source: { name: "Referral" } },
      ]);
      const result = await getLeadSources(baseFilters);
      expect(result).toEqual([{ name: "Website", Number: 2 }, { name: "Referral", Number: 1 }]);
    });
  });

  describe("getConversionRate", () => {
    it("returns leads count, converted count, and rate", async () => {
      (prismadb.crm_Leads.count as jest.Mock).mockResolvedValue(100);
      (prismadb.crm_Opportunities.count as jest.Mock).mockResolvedValue(25);
      const result = await getConversionRate(baseFilters);
      expect(result).toEqual({ leads: 100, converted: 25, rate: 25 });
    });
  });

  describe("getNewContacts", () => {
    it("groups contacts by creation month", async () => {
      (prismadb.crm_Contacts.findMany as jest.Mock).mockResolvedValue([
        { createdAt: new Date("2025-02-10") },
        { createdAt: new Date("2025-02-15") },
      ]);
      const result = await getNewContacts(baseFilters);
      expect(result).toEqual([{ name: "2025-02", Number: 2 }]);
    });
  });

  describe("getContactsByAccount", () => {
    it("groups contacts by account name", async () => {
      (prismadb.crm_Contacts.findMany as jest.Mock).mockResolvedValue([
        { assigned_accounts: { name: "Acme Corp" } },
        { assigned_accounts: { name: "Acme Corp" } },
        { assigned_accounts: null },
      ]);
      const result = await getContactsByAccount(baseFilters);
      expect(result).toEqual([{ name: "Acme Corp", Number: 2 }, { name: "Unassigned", Number: 1 }]);
    });
  });
});
