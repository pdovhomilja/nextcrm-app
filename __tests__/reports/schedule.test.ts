jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_Report_Config: { findUnique: jest.fn() },
    crm_Report_Schedule: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { createSchedule, listSchedules, updateSchedule, deleteSchedule } from "@/actions/reports/schedule";

describe("report schedule actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { getSession } = require("@/lib/auth-server");
    (getSession as jest.Mock).mockResolvedValue({ user: { id: "admin-1" } });
    (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id: "admin-1", role: "admin" });
  });

  describe("createSchedule", () => {
    it("creates a schedule linked to a config", async () => {
      (prismadb.crm_Report_Config.findUnique as jest.Mock).mockResolvedValue({ id: "config-1", createdBy: "admin-1", isShared: false });
      const mockSchedule = { id: "sched-1", reportConfigId: "config-1" };
      (prismadb.crm_Report_Schedule.create as jest.Mock).mockResolvedValue(mockSchedule);
      const result = await createSchedule({ reportConfigId: "config-1", cronExpression: "0 9 * * 1", recipients: ["alice@example.com"], format: "pdf" });
      expect(prismadb.crm_Report_Schedule.create).toHaveBeenCalledWith({ data: expect.objectContaining({ reportConfigId: "config-1", cronExpression: "0 9 * * 1", format: "pdf", createdBy: "admin-1" }) });
      expect(result).toEqual(mockSchedule);
    });
  });

  describe("listSchedules", () => {
    it("returns all schedules for admin", async () => {
      const schedules = [{ id: "sched-1" }];
      (prismadb.crm_Report_Schedule.findMany as jest.Mock).mockResolvedValue(schedules);
      const result = await listSchedules();
      expect(prismadb.crm_Report_Schedule.findMany).toHaveBeenCalledWith({ where: {}, include: { reportConfig: true }, orderBy: { createdAt: "desc" } });
      expect(result).toEqual(schedules);
    });
  });

  describe("deleteSchedule", () => {
    it("deletes schedule (admin)", async () => {
      (prismadb.crm_Report_Schedule.findUnique as jest.Mock).mockResolvedValue({ id: "sched-1", createdBy: "other-user" });
      (prismadb.crm_Report_Schedule.delete as jest.Mock).mockResolvedValue({});
      await deleteSchedule("sched-1");
      expect(prismadb.crm_Report_Schedule.delete).toHaveBeenCalledWith({ where: { id: "sched-1" } });
    });
  });
});
