import type {
  ReportFilters,
  ReportCategory,
  ChartDataPoint,
  KPIData,
  ExportFormat,
  ScheduleFrequency,
} from "@/actions/reports/types";
import {
  REPORT_CATEGORIES,
  DATE_PRESETS,
  parseSearchParamsToFilters,
  filtersToSearchParams,
} from "@/actions/reports/types";

describe("report types and helpers", () => {
  describe("REPORT_CATEGORIES", () => {
    it("contains all 6 categories", () => {
      expect(REPORT_CATEGORIES).toEqual([
        "sales",
        "leads",
        "accounts",
        "activity",
        "campaigns",
        "users",
      ]);
    });
  });

  describe("DATE_PRESETS", () => {
    it("contains expected presets", () => {
      const keys = DATE_PRESETS.map((p) => p.key);
      expect(keys).toEqual(["7d", "30d", "90d", "ytd", "all"]);
    });

    it("each preset has a getRange function returning valid dates", () => {
      for (const preset of DATE_PRESETS) {
        const { from, to } = preset.getRange();
        expect(from).toBeInstanceOf(Date);
        expect(to).toBeInstanceOf(Date);
        expect(from.getTime()).toBeLessThanOrEqual(to.getTime());
      }
    });
  });

  describe("parseSearchParamsToFilters", () => {
    it("parses from and to dates", () => {
      const params = new URLSearchParams("from=2025-01-01&to=2025-03-31");
      const filters = parseSearchParamsToFilters(params);
      expect(filters.dateFrom).toEqual(new Date("2025-01-01"));
      expect(filters.dateTo).toEqual(new Date("2025-03-31"));
    });

    it("defaults to last 30 days when no dates provided", () => {
      const params = new URLSearchParams("");
      const filters = parseSearchParamsToFilters(params);
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      expect(filters.dateTo.getTime()).toBeGreaterThanOrEqual(now.getTime() - 1000);
      expect(filters.dateFrom.getTime()).toBeGreaterThanOrEqual(thirtyDaysAgo.getTime() - 1000);
    });

    it("parses optional filter params", () => {
      const params = new URLSearchParams("from=2025-01-01&to=2025-12-31&assigneeId=user-1&salesStage=won");
      const filters = parseSearchParamsToFilters(params);
      expect(filters.assigneeId).toBe("user-1");
      expect(filters.salesStage).toBe("won");
    });
  });

  describe("filtersToSearchParams", () => {
    it("converts filters to URLSearchParams string", () => {
      const filters: ReportFilters = {
        dateFrom: new Date("2025-01-01"),
        dateTo: new Date("2025-03-31"),
        assigneeId: "user-1",
      };
      const result = filtersToSearchParams(filters);
      expect(result).toContain("from=2025-01-01");
      expect(result).toContain("to=2025-03-31");
      expect(result).toContain("assigneeId=user-1");
    });

    it("omits undefined optional fields", () => {
      const filters: ReportFilters = {
        dateFrom: new Date("2025-01-01"),
        dateTo: new Date("2025-03-31"),
      };
      const result = filtersToSearchParams(filters);
      expect(result).not.toContain("assigneeId");
      expect(result).not.toContain("salesStage");
    });
  });
});
