import { buildSearchWhere } from "@/lib/invoices/search";

describe("buildSearchWhere", () => {
  it("empty when no filters", () => expect(buildSearchWhere({})).toEqual({}));
  it("includes status filter", () => {
    const w = buildSearchWhere({ status: ["ISSUED", "PAID"] });
    expect(w.status).toEqual({ in: ["ISSUED", "PAID"] });
  });
  it("includes account filter", () => {
    expect(buildSearchWhere({ accountId: "a1" }).accountId).toBe("a1");
  });
  it("includes date range", () => {
    const w = buildSearchWhere({
      issueFrom: new Date("2026-01-01"),
      issueTo: new Date("2026-12-31"),
    });
    expect((w.issueDate as any).gte).toEqual(new Date("2026-01-01"));
    expect((w.issueDate as any).lte).toEqual(new Date("2026-12-31"));
  });
});
