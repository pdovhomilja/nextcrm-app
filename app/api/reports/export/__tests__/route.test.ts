jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: { users: { findUnique: jest.fn() } },
}));

jest.mock("@/actions/reports/sales", () => ({
  getOppsByMonth: jest.fn().mockResolvedValue([]),
}));
jest.mock("@/actions/reports/leads", () => ({
  getNewLeads: jest.fn().mockResolvedValue([]),
}));
jest.mock("@/actions/reports/accounts", () => ({
  getNewAccounts: jest.fn().mockResolvedValue([]),
}));
jest.mock("@/actions/reports/activity", () => ({
  getTasksByAssignee: jest.fn().mockResolvedValue([]),
}));
jest.mock("@/actions/reports/campaigns", () => ({
  getCampaignPerformance: jest
    .fn()
    .mockResolvedValue({ sent: 0, opened: 0, clicked: 0 }),
}));
jest.mock("@/actions/reports/users", () => ({
  getUserGrowth: jest.fn().mockResolvedValue([]),
}));
jest.mock("@/actions/reports/export-csv", () => ({
  generateCSV: jest.fn().mockReturnValue("csv,data\n"),
}));

import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import * as salesActions from "@/actions/reports/sales";
import { GET } from "../route";

const gs = getSession as jest.MockedFunction<typeof getSession>;
const fu = prismadb.users.findUnique as jest.MockedFunction<
  typeof prismadb.users.findUnique
>;

beforeEach(() => jest.clearAllMocks());

describe("GET /api/reports/export", () => {
  it("401 unauth", async () => {
    gs.mockResolvedValue(null as any);
    const res = await GET(
      new NextRequest("http://localhost/api/reports/export?category=sales"),
    );
    expect(res.status).toBe(401);
  });

  it("403 when user requests users-directory report", async () => {
    gs.mockResolvedValue({ user: { id: "u" } } as any);
    fu.mockResolvedValue({ id: "u", role: "user" } as any);
    const res = await GET(
      new NextRequest("http://localhost/api/reports/export?category=users"),
    );
    expect(res.status).toBe(403);
  });

  it("user can export sales-category report; scope passed to dispatcher", async () => {
    gs.mockResolvedValue({ user: { id: "u1" } } as any);
    fu.mockResolvedValue({ id: "u1", role: "user" } as any);
    const res = await GET(
      new NextRequest(
        "http://localhost/api/reports/export?category=sales&format=csv",
      ),
    );
    expect(res.status).toBe(200);
    const callArgs = (salesActions.getOppsByMonth as jest.Mock).mock.calls.at(
      -1,
    )!;
    const passedScope = callArgs[1];
    expect(passedScope).toBeDefined();
    expect(passedScope.opportunity).toMatchObject({
      OR: expect.arrayContaining([
        { assigned_to: "u1" },
        { createdBy: "u1" },
      ]),
    });
  });

  it("400 for unknown category", async () => {
    gs.mockResolvedValue({ user: { id: "m" } } as any);
    fu.mockResolvedValue({ id: "m", role: "manager" } as any);
    const res = await GET(
      new NextRequest("http://localhost/api/reports/export?category=bogus"),
    );
    expect(res.status).toBe(400);
  });
});
