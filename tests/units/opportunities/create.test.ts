import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-server", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: vi.fn(), findFirst: vi.fn() },
    crm_Opportunities: { create: vi.fn() },
  },
}));

vi.mock("@/lib/sendmail", () => ({
  default: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/inngest/client", () => ({
  inngest: { send: vi.fn().mockResolvedValue({}) },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/audit-log", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/currency", () => ({
  getDefaultCurrency: vi.fn().mockResolvedValue("USD"),
  getSnapshotRate: vi.fn().mockResolvedValue(null),
}));

import { createOpportunity } from "@/actions/crm/opportunities/create-opportunity";
import { inngest } from "@/inngest/client";
import { writeAuditLog } from "@/lib/audit-log";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import sendEmail from "@/lib/sendmail";

const mockUser = (id = "u1") => {
  (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id } });
};

describe("createOpportunity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser();
  });

  it("unauthenticated returns Unauthorized error", async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await createOpportunity({ name: "Opportunity" });
    expect(res).toEqual({ error: "Unauthorized" });
    expect(prismadb.crm_Opportunities.create).not.toHaveBeenCalled();
  });

  it("creates opportunity with correct default fields", async () => {
    const mockOpp = { id: "o1", name: "Opportunity", status: "ACTIVE" };
    (prismadb.crm_Opportunities.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockOpp);
    const res = await createOpportunity({ name: "Opportunity" });
    expect(res).toEqual({ data: mockOpp });
    expect(prismadb.crm_Opportunities.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "Opportunity",
        status: "ACTIVE",
        assigned_to: "u1",
        createdBy: "u1",
        updatedBy: "u1",
      }),
    });
  });

  it("sets assigned_to to userId when not provided", async () => {
    (prismadb.crm_Opportunities.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "o1" });
    await createOpportunity({ name: "Opportunity" });
    const call = (prismadb.crm_Opportunities.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.data.assigned_to).toBe("u1");
  });

  it("parses budget and expected_revenue as floats", async () => {
    (prismadb.crm_Opportunities.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "o1" });
    await createOpportunity({
      name: "Op",
      budget: "1000.50",
      expected_revenue: "2000.75",
    });
    const call = (prismadb.crm_Opportunities.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.data.budget).toBe(1000.5);
    expect(call.data.expected_revenue).toBe(2000.75);
  });

  it("parses budget and expected_revenue as undefined when not provided", async () => {
    (prismadb.crm_Opportunities.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "o1" });
    await createOpportunity({ name: "Op" });
    const call = (prismadb.crm_Opportunities.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.data.budget).toBeUndefined();
    expect(call.data.expected_revenue).toBeUndefined();
  });

  it("sends email notification when assigned_to differs from userId", async () => {
    (prismadb.crm_Opportunities.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "o1", name: "Op" });
    (prismadb.users.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "u2",
      email: "u2@test.com",
      userLanguage: "en",
    });
    (sendEmail as ReturnType<typeof vi.fn>).mockResolvedValue({});
    await createOpportunity({ name: "Op", assigned_to: "u2" });
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "u2@test.com",
        subject: expect.stringContaining("New opportunity"),
      }),
    );
  });

  it("does NOT send email when assigned_to equals userId", async () => {
    (prismadb.crm_Opportunities.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "o1" });
    await createOpportunity({ name: "Op", assigned_to: "u1" });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("writes audit log on success", async () => {
    (prismadb.crm_Opportunities.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "o1" });
    await createOpportunity({ name: "Op" });
    expect(writeAuditLog).toHaveBeenCalledWith({
      entityType: "opportunity",
      entityId: "o1",
      action: "created",
      changes: null,
      userId: "u1",
    });
  });

  it("sends inngest event on success", async () => {
    (prismadb.crm_Opportunities.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "o1" });
    await createOpportunity({ name: "Op" });
    expect(inngest.send).toHaveBeenCalledWith({
      name: "crm/opportunity.saved",
      data: { record_id: "o1" },
    });
  });

  it("revalidates opportunities path on success", async () => {
    const { revalidatePath } = await import("next/cache");
    (prismadb.crm_Opportunities.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "o1" });
    await createOpportunity({ name: "Op" });
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/(routes)/crm/opportunities", "page");
  });

  it("returns error on prisma failure", async () => {
    (prismadb.crm_Opportunities.create as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("DB error"));
    const res = await createOpportunity({ name: "Op" });
    expect(res).toEqual({ error: "Failed to create opportunity" });
  });

  it("rejects creation with non-numeric budget (NaN Injection)", async () => {
    const res = await createOpportunity({
      name: "NaN Budget Opportunity",
      account: "a1",
      sales_stage: "stage-1",
      budget: "not-a-number",
    });
    expect(res.error).toBeDefined();
    expect(prismadb.crm_Opportunities.create).not.toHaveBeenCalled();
  });

  it("rejects creation with negative budget", async () => {
    const res = await createOpportunity({
      name: "Negative Budget Opportunity",
      account: "a1",
      sales_stage: "stage-1",
      budget: "-5000.00",
    });
    expect(res.error).toBeDefined();
    expect(prismadb.crm_Opportunities.create).not.toHaveBeenCalled();
  });

  it("rejects creation with negative expected_revenue", async () => {
    const res = await createOpportunity({
      name: "Negative Revenue Opportunity",
      account: "a1",
      sales_stage: "stage-1",
      expected_revenue: "-1000.00",
    });
    expect(res.error).toBeDefined();
    expect(prismadb.crm_Opportunities.create).not.toHaveBeenCalled();
  });

  it("rejects creation with invalid sales_stage value", async () => {
    const res = await createOpportunity({
      name: "Invalid Stage Opportunity",
      account: "a1",
      sales_stage: "INVALID_STAGE_VALUE",
    });
    expect(res.error).toBeDefined();
    expect(prismadb.crm_Opportunities.create).not.toHaveBeenCalled();
  });

  it("rejects creation with close_date in the far past", async () => {
    const res = await createOpportunity({
      name: "Past Close Date Opportunity",
      account: "a1",
      sales_stage: "stage-1",
      close_date: new Date("2000-01-01"),
    });
    expect(res.error).toBeDefined();
    expect(prismadb.crm_Opportunities.create).not.toHaveBeenCalled();
  });
});
