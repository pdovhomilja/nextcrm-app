const mockSend = jest.fn();
jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({ emails: { send: mockSend } })),
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Accounts_Tasks: { findFirst: jest.fn(), create: jest.fn() },
    users: { findUnique: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { createAutoTask } from "@/lib/crm/auto-task";

describe("createAutoTask", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prismadb.crm_Accounts_Tasks.findFirst as jest.Mock).mockResolvedValue(null);
    (prismadb.crm_Accounts_Tasks.create as jest.Mock).mockResolvedValue({ id: "t1" });
    (prismadb.users.findUnique as jest.Mock).mockResolvedValue({
      id: "u1", email: "rep@x.cz", userLanguage: "en",
    });
    mockSend.mockResolvedValue({ data: { id: "r1" }, error: null });
  });

  it("creates the task and notifies the assignee", async () => {
    const res = await createAutoTask({
      title: "Cadence 1/5: Call — confirm quote receipt",
      content: "Call the client.",
      accountId: "a1",
      opportunityId: "o1",
      assigneeId: "u1",
      dueDateAt: new Date("2026-08-01"),
    });
    expect(res).toEqual({ id: "t1" });
    const data = (prismadb.crm_Accounts_Tasks.create as jest.Mock).mock.calls[0][0].data;
    expect(data).toMatchObject({
      v: 0, priority: "high", taskStatus: "ACTIVE",
      account: "a1", opportunity_id: "o1",
      user: "u1", createdBy: "u1", updatedBy: "u1",
    });
    expect(mockSend).toHaveBeenCalled();
  });

  it("skips when an open task with the same title exists for the deal", async () => {
    (prismadb.crm_Accounts_Tasks.findFirst as jest.Mock).mockResolvedValue({ id: "existing" });
    const res = await createAutoTask({
      title: "Cadence 1/5: Call — confirm quote receipt",
      content: "x", accountId: "a1", opportunityId: "o1",
      assigneeId: "u1", dueDateAt: new Date(),
    });
    expect(res).toBeNull();
    expect(prismadb.crm_Accounts_Tasks.create).not.toHaveBeenCalled();
  });

  it("skips when there is no assignee", async () => {
    const res = await createAutoTask({
      title: "T", content: "x", accountId: "a1", opportunityId: "o1",
      assigneeId: null, dueDateAt: new Date(),
    });
    expect(res).toBeNull();
    expect(prismadb.crm_Accounts_Tasks.create).not.toHaveBeenCalled();
  });

  it("still creates the task when the notification email fails", async () => {
    mockSend.mockRejectedValue(new Error("resend down"));
    const res = await createAutoTask({
      title: "T", content: "x", accountId: "a1", opportunityId: "o1",
      assigneeId: "u1", dueDateAt: new Date(),
    });
    expect(res).toEqual({ id: "t1" });
  });
});

describe("createAutoTask dedupAnyStatus", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prismadb.crm_Accounts_Tasks.findFirst as jest.Mock).mockResolvedValue(null);
    (prismadb.crm_Accounts_Tasks.create as jest.Mock).mockResolvedValue({ id: "t2" });
    (prismadb.users.findUnique as jest.Mock).mockResolvedValue({
      id: "u1", email: "rep@x.cz", userLanguage: "en",
    });
    mockSend.mockResolvedValue({ data: { id: "r1" }, error: null });
  });

  it("omits the status filter so completed tasks also dedup", async () => {
    await createAutoTask({
      title: "Renewal 2026-08-15: contract \"X\"",
      content: "x", accountId: "a1",
      assigneeId: "u1", dueDateAt: new Date(),
      dedupAnyStatus: true,
    });
    const where = (prismadb.crm_Accounts_Tasks.findFirst as jest.Mock).mock.calls[0][0].where;
    expect(where.taskStatus).toBeUndefined();
    expect(where.account).toBe("a1");
  });

  it("keeps the open-status filter by default", async () => {
    await createAutoTask({
      title: "Cadence 1/5: Call — confirm quote receipt",
      content: "x", accountId: "a1", opportunityId: "o1",
      assigneeId: "u1", dueDateAt: new Date(),
    });
    const where = (prismadb.crm_Accounts_Tasks.findFirst as jest.Mock).mock.calls[0][0].where;
    expect(where.taskStatus).toEqual({ in: ["ACTIVE", "PENDING"] });
  });
});
