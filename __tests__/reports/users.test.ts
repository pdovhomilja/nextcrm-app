jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findMany: jest.fn(), count: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { getActiveUsersByYear, getActiveUsersLifetime, getUserGrowth, getUsersByRole } from "@/actions/reports/users";
import type { ReportFilters } from "@/actions/reports/types";

const baseFilters: ReportFilters = { dateFrom: new Date("2025-01-01"), dateTo: new Date("2025-12-31") };

describe("users report actions", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("getActiveUsersByYear", () => {
    it("returns active user count grouped by year", async () => {
      (prismadb.users.findMany as jest.Mock).mockResolvedValue([
        { created_on: new Date("2023-05-10"), userStatus: "ACTIVE" },
        { created_on: new Date("2024-03-15"), userStatus: "ACTIVE" },
        { created_on: new Date("2024-08-20"), userStatus: "ACTIVE" },
        { created_on: new Date("2025-01-05"), userStatus: "ACTIVE" },
      ]);
      const result = await getActiveUsersByYear();
      expect(result).toEqual([
        { name: "2023", Number: 1 },
        { name: "2024", Number: 2 },
        { name: "2025", Number: 1 },
      ]);
    });
  });

  describe("getActiveUsersLifetime", () => {
    it("returns total count of active users", async () => {
      (prismadb.users.count as jest.Mock).mockResolvedValue(42);
      const result = await getActiveUsersLifetime();
      expect(result).toBe(42);
    });
  });

  describe("getUserGrowth", () => {
    it("groups all users by creation month in date range", async () => {
      (prismadb.users.findMany as jest.Mock).mockResolvedValue([
        { created_on: new Date("2025-01-10") },
        { created_on: new Date("2025-01-20") },
        { created_on: new Date("2025-03-15") },
      ]);
      const result = await getUserGrowth(baseFilters);
      expect(result).toEqual([
        { name: "2025-01", Number: 2 },
        { name: "2025-03", Number: 1 },
      ]);
    });
  });

  describe("getUsersByRole", () => {
    it("groups users by role", async () => {
      (prismadb.users.findMany as jest.Mock).mockResolvedValue([
        { role: "admin" },
        { role: "member" },
        { role: "viewer" },
        { role: "member" },
      ]);
      const result = await getUsersByRole(baseFilters);
      expect(result).toEqual([
        { name: "Admin", Number: 1 },
        { name: "Member", Number: 2 },
        { name: "Viewer", Number: 1 },
      ]);
    });
  });
});
