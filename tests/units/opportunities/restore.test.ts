import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-server", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: vi.fn() },
    crm_Opportunities: { update: vi.fn() },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/audit-log", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

import { restoreOpportunity } from "@/actions/crm/opportunities/restore-opportunity";
import { writeAuditLog } from "@/lib/audit-log";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";

const mockUser = (role: "user" | "manager" | "admin" = "admin", id = "u1") => {
  (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
    user: { id, role },
  });
};

describe("restoreOpportunity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser("admin");
  });

  it("unauthenticated returns Unauthorized error", async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await restoreOpportunity("o1");
    expect(res).toEqual({ error: "Unauthorized" });
    expect(prismadb.crm_Opportunities.update).not.toHaveBeenCalled();
  });

  it("non-admin returns Forbidden error", async () => {
    mockUser("user");
    const res = await restoreOpportunity("o1");
    expect(res).toEqual({ error: "Forbidden" });
    expect(prismadb.crm_Opportunities.update).not.toHaveBeenCalled();
  });

  it("manager returns Forbidden error", async () => {
    mockUser("manager");
    const res = await restoreOpportunity("o1");
    expect(res).toEqual({ error: "Forbidden" });
    expect(prismadb.crm_Opportunities.update).not.toHaveBeenCalled();
  });

  it("returns error when opportunityId is missing", async () => {
    mockUser("admin");
    const res = await restoreOpportunity("");
    expect(res).toEqual({ error: "opportunityId is required" });
  });

  it("restores opportunity by clearing deletedAt and deletedBy", async () => {
    (prismadb.crm_Opportunities.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "o1" });
    await restoreOpportunity("o1");
    expect(prismadb.crm_Opportunities.update).toHaveBeenCalledWith({
      where: { id: "o1" },
      data: {
        deletedAt: null,
        deletedBy: null,
      },
    });
  });

  it("writes audit log with action 'restored'", async () => {
    (prismadb.crm_Opportunities.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "o1" });
    await restoreOpportunity("o1");
    expect(writeAuditLog).toHaveBeenCalledWith({
      entityType: "opportunity",
      entityId: "o1",
      action: "restored",
      changes: null,
      userId: "u1",
    });
  });

  it("revalidates opportunities and audit-log paths on success", async () => {
    const { revalidatePath } = await import("next/cache");
    (prismadb.crm_Opportunities.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "o1" });
    await restoreOpportunity("o1");
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/(routes)/crm/opportunities", "page");
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/(routes)/admin/audit-log", "page");
  });

  it("returns { success: true } on success", async () => {
    (prismadb.crm_Opportunities.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "o1" });
    const res = await restoreOpportunity("o1");
    expect(res).toEqual({ success: true });
  });

  it("returns error on prisma failure", async () => {
    (prismadb.crm_Opportunities.update as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("DB error"));
    const res = await restoreOpportunity("o1");
    expect(res).toEqual({ error: "Failed to restore opportunity" });
  });
});
