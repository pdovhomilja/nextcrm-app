jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Report_Schedule: { create: jest.fn(), findMany: jest.fn(), update: jest.fn(), delete: jest.fn() },
  },
}));
jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));

import { prismadb } from "@/lib/prisma";
import { createSchedule, listSchedules, updateSchedule, deleteSchedule } from "@/actions/reports/schedule";

describe("report schedule actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { getSession } = require("@/lib/auth-server");
    (getSession as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
  });

  describe("createSchedule", () => {
    it("creates a schedule linked to a config", async () => {
      const mockSchedule = { id: "sched-1", reportConfigId: "config-1" };
      (prismadb.crm_Report_Schedule.create as jest.Mock).mockResolvedValue(mockSchedule);
      const result = await createSchedule({ reportConfigId: "config-1", cronExpression: "0 9 * * 1", recipients: ["alice@example.com"], format: "pdf" });
      expect(prismadb.crm_Report_Schedule.create).toHaveBeenCalledWith({ data: expect.objectContaining({ reportConfigId: "config-1", cronExpression: "0 9 * * 1", format: "pdf", createdBy: "user-1" }) });
      expect(result).toEqual(mockSchedule);
    });
  });

  describe("listSchedules", () => {
    it("returns schedules for the current user", async () => {
      const schedules = [{ id: "sched-1" }];
      (prismadb.crm_Report_Schedule.findMany as jest.Mock).mockResolvedValue(schedules);
      const result = await listSchedules();
      expect(prismadb.crm_Report_Schedule.findMany).toHaveBeenCalledWith({ where: { createdBy: "user-1" }, include: { reportConfig: true }, orderBy: { createdAt: "desc" } });
      expect(result).toEqual(schedules);
    });
  });

  describe("deleteSchedule", () => {
    it("deletes schedule owned by user", async () => {
      (prismadb.crm_Report_Schedule.delete as jest.Mock).mockResolvedValue({});
      await deleteSchedule("sched-1");
      expect(prismadb.crm_Report_Schedule.delete).toHaveBeenCalledWith({ where: { id: "sched-1", createdBy: "user-1" } });
    });
  });
});
