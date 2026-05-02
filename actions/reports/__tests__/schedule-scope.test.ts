jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_Report_Config: { findUnique: jest.fn() },
    crm_Report_Schedule: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { createSchedule, listSchedules, updateSchedule, deleteSchedule } from "@/actions/reports/schedule";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

describe("report schedule scope", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("unauthenticated", () => {
    beforeEach(() => {
      (getSession as jest.Mock).mockResolvedValue(null);
    });
    it.each([
      ["createSchedule", () => createSchedule({ reportConfigId: "c1", cronExpression: "0 9 * * 1", recipients: [], format: "pdf" as const })],
      ["listSchedules", () => listSchedules()],
      ["updateSchedule", () => updateSchedule("s1", {})],
      ["deleteSchedule", () => deleteSchedule("s1")],
    ])("rejects %s when no session", async (_name, fn) => {
      await expect(fn()).rejects.toThrow();
    });
  });

  describe("createSchedule", () => {
    it("user can schedule own config", async () => {
      mockUser("user", "u1");
      (prismadb.crm_Report_Config.findUnique as jest.Mock).mockResolvedValue({ id: "c1", createdBy: "u1", isShared: false });
      (prismadb.crm_Report_Schedule.create as jest.Mock).mockResolvedValue({});
      await createSchedule({ reportConfigId: "c1", cronExpression: "0 9 * * 1", recipients: [], format: "pdf" });
      expect(prismadb.crm_Report_Schedule.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ reportConfigId: "c1", createdBy: "u1" }),
      });
    });

    it("user can schedule shared config", async () => {
      mockUser("user", "u1");
      (prismadb.crm_Report_Config.findUnique as jest.Mock).mockResolvedValue({ id: "c1", createdBy: "u2", isShared: true });
      (prismadb.crm_Report_Schedule.create as jest.Mock).mockResolvedValue({});
      await createSchedule({ reportConfigId: "c1", cronExpression: "0 9 * * 1", recipients: [], format: "pdf" });
      expect(prismadb.crm_Report_Schedule.create).toHaveBeenCalled();
    });

    it("user cannot schedule other's private config", async () => {
      mockUser("user", "u1");
      (prismadb.crm_Report_Config.findUnique as jest.Mock).mockResolvedValue({ id: "c1", createdBy: "u2", isShared: false });
      await expect(
        createSchedule({ reportConfigId: "c1", cronExpression: "0 9 * * 1", recipients: [], format: "pdf" })
      ).rejects.toThrow(/Forbidden/i);
      expect(prismadb.crm_Report_Schedule.create).not.toHaveBeenCalled();
    });

    it("throws Not found when config missing", async () => {
      mockUser("user", "u1");
      (prismadb.crm_Report_Config.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(
        createSchedule({ reportConfigId: "c1", cronExpression: "0 9 * * 1", recipients: [], format: "pdf" })
      ).rejects.toThrow(/Not found/i);
    });
  });

  describe("listSchedules", () => {
    it("user sees only own schedules", async () => {
      mockUser("user", "u1");
      (prismadb.crm_Report_Schedule.findMany as jest.Mock).mockResolvedValue([]);
      await listSchedules();
      expect(prismadb.crm_Report_Schedule.findMany).toHaveBeenCalledWith({
        where: { createdBy: "u1" },
        include: { reportConfig: true },
        orderBy: { createdAt: "desc" },
      });
    });

    it("manager sees all schedules", async () => {
      mockUser("manager", "m1");
      (prismadb.crm_Report_Schedule.findMany as jest.Mock).mockResolvedValue([]);
      await listSchedules();
      expect(prismadb.crm_Report_Schedule.findMany).toHaveBeenCalledWith({
        where: {},
        include: { reportConfig: true },
        orderBy: { createdAt: "desc" },
      });
    });

    it("admin sees all schedules", async () => {
      mockUser("admin", "a1");
      (prismadb.crm_Report_Schedule.findMany as jest.Mock).mockResolvedValue([]);
      await listSchedules();
      expect(prismadb.crm_Report_Schedule.findMany).toHaveBeenCalledWith({
        where: {},
        include: { reportConfig: true },
        orderBy: { createdAt: "desc" },
      });
    });
  });

  describe("updateSchedule", () => {
    it("user can update own schedule", async () => {
      mockUser("user", "u1");
      (prismadb.crm_Report_Schedule.findUnique as jest.Mock).mockResolvedValue({ id: "s1", createdBy: "u1" });
      (prismadb.crm_Report_Schedule.update as jest.Mock).mockResolvedValue({});
      await updateSchedule("s1", { isActive: false });
      expect(prismadb.crm_Report_Schedule.update).toHaveBeenCalledWith({ where: { id: "s1" }, data: { isActive: false } });
    });

    it("user cannot update other's schedule", async () => {
      mockUser("user", "u1");
      (prismadb.crm_Report_Schedule.findUnique as jest.Mock).mockResolvedValue({ id: "s1", createdBy: "u2" });
      await expect(updateSchedule("s1", {})).rejects.toThrow(/Forbidden/i);
    });

    it("manager can update other's schedule", async () => {
      mockUser("manager", "m1");
      (prismadb.crm_Report_Schedule.findUnique as jest.Mock).mockResolvedValue({ id: "s1", createdBy: "u2" });
      (prismadb.crm_Report_Schedule.update as jest.Mock).mockResolvedValue({});
      await updateSchedule("s1", {});
      expect(prismadb.crm_Report_Schedule.update).toHaveBeenCalled();
    });
  });

  describe("deleteSchedule", () => {
    it("user cannot delete other's schedule", async () => {
      mockUser("user", "u1");
      (prismadb.crm_Report_Schedule.findUnique as jest.Mock).mockResolvedValue({ id: "s1", createdBy: "u2" });
      await expect(deleteSchedule("s1")).rejects.toThrow(/Forbidden/i);
    });

    it("admin can delete any schedule", async () => {
      mockUser("admin", "a1");
      (prismadb.crm_Report_Schedule.findUnique as jest.Mock).mockResolvedValue({ id: "s1", createdBy: "u2" });
      (prismadb.crm_Report_Schedule.delete as jest.Mock).mockResolvedValue({});
      await deleteSchedule("s1");
      expect(prismadb.crm_Report_Schedule.delete).toHaveBeenCalledWith({ where: { id: "s1" } });
    });

    it("throws Not found when missing", async () => {
      mockUser("admin", "a1");
      (prismadb.crm_Report_Schedule.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(deleteSchedule("s1")).rejects.toThrow(/Not found/i);
    });
  });
});
