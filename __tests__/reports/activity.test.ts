jest.mock("@/lib/prisma", () => ({
  prismadb: {
    Tasks: { findMany: jest.fn(), count: jest.fn() },
    crm_Activities: { findMany: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { getTasksCreatedCompleted, getOverdueTasks, getTasksByAssignee, getActivitiesByType } from "@/actions/reports/activity";
import type { ReportFilters } from "@/actions/reports/types";

const baseFilters: ReportFilters = { dateFrom: new Date("2025-01-01"), dateTo: new Date("2025-12-31") };

describe("activity report actions", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("getTasksCreatedCompleted", () => {
    it("returns created and completed task counts by month", async () => {
      (prismadb.Tasks.findMany as jest.Mock).mockResolvedValue([
        { createdAt: new Date("2025-01-10"), taskStatus: "ACTIVE" },
        { createdAt: new Date("2025-01-20"), taskStatus: "COMPLETE" },
        { createdAt: new Date("2025-02-10"), taskStatus: "COMPLETE" },
      ]);
      const result = await getTasksCreatedCompleted(baseFilters);
      expect(result).toEqual([
        { name: "2025-01", created: 2, completed: 1 },
        { name: "2025-02", created: 1, completed: 1 },
      ]);
    });
  });

  describe("getOverdueTasks", () => {
    it("returns count of overdue tasks", async () => {
      (prismadb.Tasks.count as jest.Mock).mockResolvedValue(5);
      const result = await getOverdueTasks(baseFilters);
      expect(result).toBe(5);
    });
  });

  describe("getTasksByAssignee", () => {
    it("groups tasks by assigned user name", async () => {
      (prismadb.Tasks.findMany as jest.Mock).mockResolvedValue([
        { assigned_user: { name: "Alice" } },
        { assigned_user: { name: "Alice" } },
        { assigned_user: { name: "Bob" } },
      ]);
      const result = await getTasksByAssignee(baseFilters);
      expect(result).toEqual([{ name: "Alice", Number: 2 }, { name: "Bob", Number: 1 }]);
    });
  });

  describe("getActivitiesByType", () => {
    it("groups activities by type", async () => {
      (prismadb.crm_Activities.findMany as jest.Mock).mockResolvedValue([
        { type: "call" }, { type: "call" }, { type: "meeting" }, { type: "email" },
      ]);
      const result = await getActivitiesByType(baseFilters);
      expect(result).toEqual([{ name: "call", Number: 2 }, { name: "meeting", Number: 1 }, { name: "email", Number: 1 }]);
    });
  });
});
