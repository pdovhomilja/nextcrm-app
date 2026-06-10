import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Opportunities: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/currency", () => ({
  getExchangeRates: vi.fn().mockResolvedValue({ USD: 1, EUR: 0.85 }),
  convertAmount: vi.fn((budget, from, to, rates) => {
    if (from === to) return budget;
    return budget.mul(rates[to] || 1);
  }),
}));

import { getExpectedRevenue } from "@/actions/crm/opportunity/get-expected-revenue";
import { convertAmount } from "@/lib/currency";
import { prismadb } from "@/lib/prisma";

describe("getExpectedRevenue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 0 when no active opportunities", async () => {
    (prismadb.crm_Opportunities.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const res = await getExpectedRevenue("USD");
    expect(res).toBe(0);
  });

  it("sums budgets in display currency", async () => {
    (prismadb.crm_Opportunities.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { budget: 1000, currency: "USD" },
      { budget: 500, currency: "USD" },
    ]);
    const res = await getExpectedRevenue("USD");
    expect(res).toBe(1500);
  });

  it("converts currencies correctly", async () => {
    (prismadb.crm_Opportunities.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { budget: 100, currency: "EUR" },
      { budget: 100, currency: "USD" },
    ]);
    (convertAmount as ReturnType<typeof vi.fn>).mockImplementation((budget, from, to) => {
      if (from === "EUR" && to === "USD") return budget.mul(1.18);
      return budget;
    });
    const res = await getExpectedRevenue("USD");
    expect(res).toBeCloseTo(218, 0);
  });

  it("handles null budget as 0", async () => {
    (prismadb.crm_Opportunities.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { budget: null, currency: "USD" },
      { budget: 200, currency: "USD" },
    ]);
    const res = await getExpectedRevenue("USD");
    expect(res).toBe(200);
  });

  it("uses display currency when opportunity currency is null", async () => {
    (prismadb.crm_Opportunities.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { budget: 300, currency: null },
    ]);
    const res = await getExpectedRevenue("USD");
    expect(res).toBe(300);
  });
});
