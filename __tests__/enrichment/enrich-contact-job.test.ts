import { shouldSkipBulkEnrichment } from "@/inngest/functions/enrich-contact";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

describe("shouldSkipBulkEnrichment", () => {
  it("returns false when no recent completed record exists", () => {
    expect(shouldSkipBulkEnrichment(null)).toBe(false);
  });

  it("returns true when completed record is within last 7 days", () => {
    const recentDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
    expect(shouldSkipBulkEnrichment(recentDate)).toBe(true);
  });

  it("returns false when completed record is older than 7 days", () => {
    const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000); // 8 days ago
    expect(shouldSkipBulkEnrichment(oldDate)).toBe(false);
  });

  it("returns false exactly at the 7-day boundary", () => {
    const exactDate = new Date(Date.now() - SEVEN_DAYS_MS - 1000); // just over 7 days
    expect(shouldSkipBulkEnrichment(exactDate)).toBe(false);
  });
});
