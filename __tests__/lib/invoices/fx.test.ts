import { fetchFxRate } from "@/lib/invoices/fx";

describe("fetchFxRate", () => {
  it("returns 1 when from === to", async () => {
    const rate = await fetchFxRate("USD", "USD");
    expect(rate.toString()).toBe("1");
  });
});
