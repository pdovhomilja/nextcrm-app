import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    currency: {
      findMany: vi.fn(),
    },
  },
}));

import { getCurrencies } from "@/actions/crm/get-currencies";
import { prismadb } from "@/lib/prisma";

describe("getCurrencies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns enabled currencies with correct fields", async () => {
    const currencies = [
      { code: "USD", name: "US Dollar", symbol: "$" },
      { code: "EUR", name: "Euro", symbol: "€" },
    ];
    (prismadb.currency.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(currencies);
    const res = await getCurrencies();
    expect(res).toEqual({ data: currencies });
    expect(prismadb.currency.findMany).toHaveBeenCalledWith({
      where: { isEnabled: true },
      select: { code: true, name: true, symbol: true },
      orderBy: { code: "asc" },
    });
  });

  it("returns error on prisma failure", async () => {
    (prismadb.currency.findMany as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("DB error"));
    const res = await getCurrencies();
    expect(res).toEqual({ error: "Failed to fetch currencies" });
  });
});
