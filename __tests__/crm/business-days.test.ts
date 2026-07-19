import { addBusinessDays } from "@/lib/crm/business-days";

describe("addBusinessDays", () => {
  it("adds within a week", () => {
    // Wed 2026-07-15 + 2 -> Fri 2026-07-17
    expect(addBusinessDays(new Date("2026-07-15T10:00:00Z"), 2)).toEqual(
      new Date("2026-07-17T10:00:00Z"),
    );
  });
  it("skips a weekend", () => {
    // Thu 2026-07-16 + 3 -> Tue 2026-07-21
    expect(addBusinessDays(new Date("2026-07-16T10:00:00Z"), 3)).toEqual(
      new Date("2026-07-21T10:00:00Z"),
    );
  });
  it("starting on Saturday counts from the next Monday", () => {
    // Sat 2026-07-18 + 1 -> Mon 2026-07-20
    expect(addBusinessDays(new Date("2026-07-18T10:00:00Z"), 1)).toEqual(
      new Date("2026-07-20T10:00:00Z"),
    );
  });
  it("n=0 returns the same instant", () => {
    const d = new Date("2026-07-15T10:00:00Z");
    expect(addBusinessDays(d, 0)).toEqual(d);
  });
});
