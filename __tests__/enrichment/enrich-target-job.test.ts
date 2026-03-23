import { shouldSkipTargetEnrichment } from "@/inngest/functions/enrich-target";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

describe("shouldSkipTargetEnrichment", () => {
  it("returns false when no recent completed record exists", () => {
    expect(shouldSkipTargetEnrichment(null)).toBe(false);
  });

  it("returns true when completed record is within last 7 days", () => {
    const recentDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    expect(shouldSkipTargetEnrichment(recentDate)).toBe(true);
  });

  it("returns false when completed record is older than 7 days", () => {
    const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    expect(shouldSkipTargetEnrichment(oldDate)).toBe(false);
  });

  it("returns false exactly past the 7-day boundary", () => {
    const exactDate = new Date(Date.now() - SEVEN_DAYS_MS - 1000);
    expect(shouldSkipTargetEnrichment(exactDate)).toBe(false);
  });
});
