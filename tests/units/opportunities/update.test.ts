import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-server", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: vi.fn() },
    crm_Opportunities: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("@/inngest/client", () => ({
  inngest: { send: vi.fn().mockResolvedValue({}) },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/audit-log", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
  diffObjects: vi.fn().mockReturnValue({ name: ["Old", "New"] }),
}));

vi.mock("@/lib/currency", () => ({
  getDefaultCurrency: vi.fn().mockResolvedValue("USD"),
  getSnapshotRate: vi.fn().mockResolvedValue(null),
}));

import { updateOpportunity } from "@/actions/crm/opportunities/update-opportunity";
import { inngest } from "@/inngest/client";
import { diffObjects, writeAuditLog } from "@/lib/audit-log";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";

const mockUser = (id = "u1") => {
  (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id } });
};

describe("updateOpportunity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser();
  });

  it("unauthenticated returns Unauthorized error", async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await updateOpportunity({ id: "o1", name: "Op" });
    expect(res).toEqual({ error: "Unauthorized" });
    expect(prismadb.crm_Opportunities.update).not.toHaveBeenCalled();
  });

  it("returns error when id is missing", async () => {
    mockUser();
    const res = await updateOpportunity({ name: "Op" } as any);
    expect(res).toEqual({ error: "id is required" });
  });

  it("fetches before state via findUnique with deletedAt:null", async () => {
    (prismadb.crm_Opportunities.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "o1", name: "Old" });
    (prismadb.crm_Opportunities.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "o1", name: "New" });
    await updateOpportunity({ id: "o1", name: "New" });
    expect(prismadb.crm_Opportunities.findUnique).toHaveBeenCalledWith({
      where: { id: "o1", deletedAt: null },
    });
  });

  it("updates opportunity with correct fields", async () => {
    (prismadb.crm_Opportunities.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "o1" });
    (prismadb.crm_Opportunities.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "o1", name: "New" });
    const res = await updateOpportunity({ id: "o1", name: "New" });
    expect(res).toEqual({ data: { id: "o1", name: "New" } });
    expect(prismadb.crm_Opportunities.update).toHaveBeenCalledWith({
      where: { id: "o1" },
      data: expect.objectContaining({
        name: "New",
        updatedBy: "u1",
        status: "ACTIVE",
      }),
    });
  });

  it("parses budget and expected_revenue as floats", async () => {
    (prismadb.crm_Opportunities.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "o1" });
    (prismadb.crm_Opportunities.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "o1" });
    await updateOpportunity({
      id: "o1",
      budget: "1000.50",
      expected_revenue: "2000.75",
    });
    const call = (prismadb.crm_Opportunities.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.data.budget).toBe(1000.5);
    expect(call.data.expected_revenue).toBe(2000.75);
  });

  it("sets status to ACTIVE", async () => {
    (prismadb.crm_Opportunities.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "o1" });
    (prismadb.crm_Opportunities.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "o1" });
    await updateOpportunity({ id: "o1" });
    const call = (prismadb.crm_Opportunities.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.data.status).toBe("ACTIVE");
  });

  it("calls diffObjects with serialized before and after", async () => {
    const before = { id: "o1", name: "Old" };
    const after = { id: "o1", name: "New" };
    (prismadb.crm_Opportunities.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(before);
    (prismadb.crm_Opportunities.update as ReturnType<typeof vi.fn>).mockResolvedValue(after);
    await updateOpportunity({ id: "o1", name: "New" });
    expect(diffObjects).toHaveBeenCalled();
  });

  it("writes audit log with changes on success", async () => {
    (prismadb.crm_Opportunities.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "o1" });
    (prismadb.crm_Opportunities.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "o1" });
    await updateOpportunity({ id: "o1", name: "New" });
    expect(writeAuditLog).toHaveBeenCalledWith({
      entityType: "opportunity",
      entityId: "o1",
      action: "updated",
      changes: { name: ["Old", "New"] },
      userId: "u1",
    });
  });

  it("sends inngest event on success", async () => {
    (prismadb.crm_Opportunities.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "o1" });
    (prismadb.crm_Opportunities.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "o1" });
    await updateOpportunity({ id: "o1", name: "New" });
    expect(inngest.send).toHaveBeenCalledWith({
      name: "crm/opportunity.saved",
      data: { record_id: "o1" },
    });
  });

  it("revalidates opportunities path on success", async () => {
    const { revalidatePath } = await import("next/cache");
    (prismadb.crm_Opportunities.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "o1" });
    (prismadb.crm_Opportunities.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "o1" });
    await updateOpportunity({ id: "o1", name: "New" });
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/(routes)/crm/opportunities", "page");
  });

  it("returns error on prisma failure", async () => {
    (prismadb.crm_Opportunities.update as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("DB error"));
    const res = await updateOpportunity({ id: "o1", name: "Op" });
    expect(res).toEqual({ error: "Failed to update opportunity" });
  });
});
