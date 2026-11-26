jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn(), findMany: jest.fn() },
    crm_Report_Config: { findUnique: jest.fn() },
    crm_Report_Schedule: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { createSchedule, updateSchedule } from "@/actions/reports/schedule";

const asRole = (role: "user" | "manager" | "admin") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id: "u1" } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id: "u1", role });
};
const activeUsers = (...emails: string[]) =>
  (prismadb.users.findMany as jest.Mock).mockResolvedValue(emails.map((email) => ({ email })));
const create = (over: Partial<{ cronExpression: string; recipients: string[] }> = {}) =>
  createSchedule({ reportConfigId: "c1", cronExpression: "0 9 * * 1", recipients: ["colleague@crm.example"], format: "pdf", ...over });

describe("report schedule limits", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prismadb.crm_Report_Config.findUnique as jest.Mock).mockResolvedValue({ id: "c1", createdBy: "u1", isShared: false });
    (prismadb.crm_Report_Schedule.findUnique as jest.Mock).mockResolvedValue({ id: "s1", createdBy: "u1" });
    (prismadb.crm_Report_Schedule.create as jest.Mock).mockResolvedValue({});
    (prismadb.crm_Report_Schedule.update as jest.Mock).mockResolvedValue({});
  });

  it("lets a user mail active colleagues", async () => {
    asRole("user");
    activeUsers("colleague@crm.example");
    await create();
    expect(prismadb.crm_Report_Schedule.create).toHaveBeenCalled();
    expect(prismadb.users.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userStatus: "ACTIVE" }) }),
    );
  });

  it("matches colleague addresses regardless of case", async () => {
    asRole("user");
    activeUsers("colleague@crm.example");
    await create({ recipients: ["Colleague@CRM.example"] });
    expect(prismadb.crm_Report_Schedule.create).toHaveBeenCalled();
  });

  it("refuses an address outside the instance's active users for a user", async () => {
    asRole("user");
    activeUsers("colleague@crm.example");
    await expect(create({ recipients: ["colleague@crm.example", "someone@outside.example"] })).rejects.toThrow();
    expect(prismadb.crm_Report_Schedule.create).not.toHaveBeenCalled();
  });

  it("refuses an outside address on update for a user", async () => {
    asRole("user");
    activeUsers();
    await expect(updateSchedule("s1", { recipients: ["someone@outside.example"] })).rejects.toThrow();
    expect(prismadb.crm_Report_Schedule.update).not.toHaveBeenCalled();
  });

  it.each(["manager", "admin"] as const)("lets a %s mail any address", async (role) => {
    asRole(role);
    activeUsers();
    await create({ recipients: ["partner@outside.example"] });
    expect(prismadb.crm_Report_Schedule.create).toHaveBeenCalled();
  });

  it("refuses an empty list and more than 10 recipients", async () => {
    asRole("admin");
    await expect(create({ recipients: [] })).rejects.toThrow();
    const eleven = Array.from({ length: 11 }, (_, i) => `r${i}@outside.example`);
    await expect(create({ recipients: eleven })).rejects.toThrow();
    await create({ recipients: eleven.slice(0, 10) });
    expect(prismadb.crm_Report_Schedule.create).toHaveBeenCalledTimes(1);
  });

  it.each(["0 9 * * *", "0 9 * * 1", "0 9 * * 5", "0 9 1 * *", "0 9 15 * *"])("accepts the supported schedule %s", async (cron) => {
    asRole("admin");
    await create({ cronExpression: cron });
    expect(prismadb.crm_Report_Schedule.create).toHaveBeenCalled();
  });

  it.each(["x", "*/15 * * * *", "0 9 * * *x", "0 9 * * 7", "0 9 32 * *", "* * * * *"])("refuses the unsupported schedule %s", async (cron) => {
    asRole("admin");
    await expect(create({ cronExpression: cron })).rejects.toThrow();
    await expect(updateSchedule("s1", { cronExpression: cron })).rejects.toThrow();
    expect(prismadb.crm_Report_Schedule.create).not.toHaveBeenCalled();
    expect(prismadb.crm_Report_Schedule.update).not.toHaveBeenCalled();
  });
});
