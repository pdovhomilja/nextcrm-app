jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Opportunities: { create: jest.fn() },
    users: { findFirst: jest.fn() },
  },
}));
jest.mock("@/lib/sendmail", () => ({ __esModule: true, default: jest.fn() }));
jest.mock("@/inngest/client", () => ({
  inngest: { send: jest.fn().mockResolvedValue({}) },
}));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn() }));
jest.mock("@/lib/currency", () => ({
  getDefaultCurrency: jest.fn().mockResolvedValue("CZK"),
  getSnapshotRate: jest.fn().mockResolvedValue(null),
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { createOpportunity } from "@/actions/crm/opportunities/create-opportunity";

describe("createOpportunity delivery_deadline", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSession as jest.Mock).mockResolvedValue({ user: { id: "u1" } });
    (prismadb.crm_Opportunities.create as jest.Mock).mockResolvedValue({ id: "opp-1" });
  });

  it("persists delivery_deadline when provided", async () => {
    const deadline = new Date("2026-09-30");
    await createOpportunity({ name: "Deal", delivery_deadline: deadline });
    const data = (prismadb.crm_Opportunities.create as jest.Mock).mock.calls[0][0].data;
    expect(data.delivery_deadline).toEqual(deadline);
  });

  it("omits delivery_deadline when not provided", async () => {
    await createOpportunity({ name: "Deal" });
    const data = (prismadb.crm_Opportunities.create as jest.Mock).mock.calls[0][0].data;
    expect(data.delivery_deadline).toBeUndefined();
  });
});
