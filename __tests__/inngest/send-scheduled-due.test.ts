jest.mock("@/inngest/client", () => ({
  inngest: { createFunction: jest.fn((_config: unknown, handler: unknown) => handler) },
}));
const send = jest.fn();
jest.mock("@/lib/resend", () => ({ __esModule: true, default: jest.fn(async () => ({ emails: { send } })) }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn(), findMany: jest.fn() },
    crm_Report_Schedule: { findMany: jest.fn(), update: jest.fn() },
  },
}));
jest.mock("@/actions/reports/users", () => ({ getUserGrowth: jest.fn(async () => []) }));

import { prismadb } from "@/lib/prisma";
import { reportSendScheduled } from "@/inngest/functions/reports/send-scheduled";

const run = reportSendScheduled as unknown as (ctx: { step: unknown }) => Promise<unknown>;
const step = { run: async (_id: string, fn: () => unknown) => fn() };
const schedule = (over: Record<string, unknown> = {}) => ({
  id: "s1", createdBy: "u1", cronExpression: "0 9 * * *", lastSentAt: null, format: "csv",
  recipients: ["colleague@crm.example"], reportConfig: { name: "Growth", category: "users", filters: {} }, ...over,
});
const owner = (role: string) =>
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id: "u1", role, userStatus: "ACTIVE" });

describe("scheduled report sending", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    owner("admin");
    (prismadb.users.findMany as jest.Mock).mockResolvedValue([{ email: "colleague@crm.example" }]);
  });

  it("sends a supported schedule that is due", async () => {
    (prismadb.crm_Report_Schedule.findMany as jest.Mock).mockResolvedValue([schedule()]);
    await run({ step });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["never sent", null],
    ["last sent a month ago", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)],
  ])("never sends an unsupported stored schedule (%s)", async (_label, lastSentAt) => {
    (prismadb.crm_Report_Schedule.findMany as jest.Mock).mockResolvedValue([schedule({ cronExpression: "x", lastSentAt })]);
    await run({ step });
    expect(send).not.toHaveBeenCalled();
  });

  it("does not resend a weekly schedule after an hour", async () => {
    (prismadb.crm_Report_Schedule.findMany as jest.Mock).mockResolvedValue([
      schedule({ cronExpression: "0 9 * * 1", lastSentAt: new Date(Date.now() - 60 * 60 * 1000) }),
    ]);
    await run({ step });
    expect(send).not.toHaveBeenCalled();
  });

  it("mails only active users when a user owns the schedule", async () => {
    owner("user");
    (prismadb.crm_Report_Schedule.findMany as jest.Mock).mockResolvedValue([
      schedule({ recipients: ["colleague@crm.example", "someone@outside.example"] }),
    ]);
    await run({ step });
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: ["colleague@crm.example"] }));
  });

  it("sends nothing when no allowed recipient is left", async () => {
    owner("user");
    (prismadb.crm_Report_Schedule.findMany as jest.Mock).mockResolvedValue([schedule({ recipients: ["someone@outside.example"] })]);
    await run({ step });
    expect(send).not.toHaveBeenCalled();
  });

  it("sends to at most 10 recipients", async () => {
    const many = Array.from({ length: 12 }, (_, i) => `r${i}@outside.example`);
    (prismadb.crm_Report_Schedule.findMany as jest.Mock).mockResolvedValue([schedule({ recipients: many })]);
    await run({ step });
    expect(send.mock.calls[0][0].to).toEqual(many.slice(0, 10));
  });
});
