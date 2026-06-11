import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react", () => ({
  cache: vi.fn((fn) => fn),
}));

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Accounts: { findMany: vi.fn() },
    crm_Opportunities: { findMany: vi.fn() },
    crm_Leads: { findMany: vi.fn() },
    crm_Contacts: { findMany: vi.fn() },
    crm_Contracts: { findMany: vi.fn() },
    crm_Opportunities_Type: { findMany: vi.fn() },
    crm_Opportunities_Sales_Stages: { findMany: vi.fn() },
    crm_campaigns: { findMany: vi.fn() },
    crm_Industry_Type: { findMany: vi.fn() },
    crm_Contact_Types: { findMany: vi.fn() },
    crm_Lead_Sources: { findMany: vi.fn() },
    crm_Lead_Statuses: { findMany: vi.fn() },
    crm_Lead_Types: { findMany: vi.fn() },
    currency: { findMany: vi.fn() },
    exchangeRate: { findMany: vi.fn() },
    crm_ProductCategories: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/serialize-decimals", () => ({
  serializeDecimalsList: vi.fn((data) => data),
}));

import { getAllCrmData } from "@/actions/crm/get-crm-data";
import { prismadb } from "@/lib/prisma";

describe("getAllCrmData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prismadb.crm_Accounts.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prismadb.crm_Opportunities.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prismadb.crm_Leads.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prismadb.crm_Contacts.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prismadb.crm_Contracts.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prismadb.crm_Opportunities_Type.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prismadb.crm_Opportunities_Sales_Stages.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prismadb.crm_campaigns.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prismadb.crm_Industry_Type.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prismadb.crm_Contact_Types.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prismadb.crm_Lead_Sources.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prismadb.crm_Lead_Statuses.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prismadb.crm_Lead_Types.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prismadb.currency.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prismadb.exchangeRate.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prismadb.crm_ProductCategories.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  });

  it("fetches all CRM data", async () => {
    const res = await getAllCrmData();
    expect(res).toHaveProperty("accounts");
    expect(res).toHaveProperty("opportunities");
    expect(res).toHaveProperty("leads");
    expect(res).toHaveProperty("contacts");
    expect(res).toHaveProperty("contracts");
    expect(res).toHaveProperty("saleTypes");
    expect(res).toHaveProperty("saleStages");
    expect(res).toHaveProperty("campaigns");
    expect(res).toHaveProperty("industries");
    expect(res).toHaveProperty("contactTypes");
    expect(res).toHaveProperty("leadSources");
    expect(res).toHaveProperty("leadStatuses");
    expect(res).toHaveProperty("leadTypes");
    expect(res).toHaveProperty("currencies");
    expect(res).toHaveProperty("productCategories");
    expect(res).toHaveProperty("exchangeRates");
  });

  it("maps exchange rates to numbers", async () => {
    (prismadb.exchangeRate.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { fromCurrency: "USD", toCurrency: "EUR", rate: "0.85" },
    ]);
    const res = await getAllCrmData();
    expect(res.exchangeRates).toEqual([{ fromCurrency: "USD", toCurrency: "EUR", rate: 0.85 }]);
  });
});
