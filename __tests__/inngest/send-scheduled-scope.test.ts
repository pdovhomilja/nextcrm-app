jest.mock("@/inngest/client", () => ({
  inngest: { createFunction: jest.fn(() => ({})) },
}));

jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: jest.fn() },
  })),
}));

jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("@/actions/reports/sales", () => ({
  getOppsByMonth: jest.fn(),
  getRevenue: jest.fn(),
  getPipelineValue: jest.fn(),
  getOppsByStage: jest.fn(),
  getWinLossRate: jest.fn(),
  getAvgDealSize: jest.fn(),
  getSalesCycleLength: jest.fn(),
}));

jest.mock("@/actions/reports/leads", () => ({
  getNewLeads: jest.fn(),
}));

jest.mock("@/actions/reports/accounts", () => ({
  getNewAccounts: jest.fn(),
}));

jest.mock("@/actions/reports/activity", () => ({
  getTasksByAssignee: jest.fn(),
}));

jest.mock("@/actions/reports/campaigns", () => ({
  getCampaignPerformance: jest.fn(),
}));

jest.mock("@/actions/reports/users", () => ({
  getUserGrowth: jest.fn(),
}));

import * as salesActions from "@/actions/reports/sales";
import * as usersActions from "@/actions/reports/users";
import { getReportData } from "@/inngest/functions/reports/send-scheduled";
import { getReportScope } from "@/lib/authz/scopes/report-scope";
import type { ReportFilters } from "@/actions/reports/types";

const baseFilters: ReportFilters = {
  dateFrom: new Date("2025-01-01"),
  dateTo: new Date("2025-12-31"),
};

describe("send-scheduled scope dispatch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (salesActions.getOppsByMonth as jest.Mock).mockResolvedValue([]);
    (usersActions.getUserGrowth as jest.Mock).mockResolvedValue([]);
  });

  it("forwards user-role scope to category dispatcher (sales)", async () => {
    const scope = getReportScope({ id: "user-123", role: "user" });
    expect(scope.opportunity).toEqual({
      OR: [{ assigned_to: "user-123" }, { createdBy: "user-123" }],
    });

    await getReportData("sales", baseFilters, scope);

    expect(salesActions.getOppsByMonth).toHaveBeenCalledTimes(1);
    const call = (salesActions.getOppsByMonth as jest.Mock).mock.calls[0];
    expect(call[0]).toBe(baseFilters);
    expect(call[1]).toBe(scope);
    expect(call[1].opportunity).toEqual({
      OR: [{ assigned_to: "user-123" }, { createdBy: "user-123" }],
    });
    expect(call[1].allowUserDirectory).toBe(false);
  });

  it("forwards admin scope (empty) to dispatcher", async () => {
    const scope = getReportScope({ id: "admin-1", role: "admin" });
    await getReportData("sales", baseFilters, scope);
    const call = (salesActions.getOppsByMonth as jest.Mock).mock.calls[0];
    expect(call[1].opportunity).toEqual({});
    expect(call[1].allowUserDirectory).toBe(true);
  });

  it("blocks users-directory report for non-admins via scope.allowUserDirectory", async () => {
    const scope = getReportScope({ id: "user-123", role: "user" });
    const result = await getReportData("users", baseFilters, scope);
    expect(usersActions.getUserGrowth).not.toHaveBeenCalled();
    expect(result.data).toEqual([]);
  });
});
