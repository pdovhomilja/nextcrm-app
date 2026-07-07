import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-server", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Accounts: { update: vi.fn() },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/audit-log", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

import { deleteAccount } from "@/actions/crm/accounts/delete-account";
import { writeAuditLog } from "@/lib/audit-log";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";

const mockUser = (id = "u1") => {
  (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id } });
};

describe("deleteAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser();
  });

  it("unauthenticated returns Unauthorized error", async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await deleteAccount("a1");
    expect(res).toEqual({ error: "Unauthorized" });
    expect(prismadb.crm_Accounts.update).not.toHaveBeenCalled();
  });

  it("missing accountId returns error", async () => {
    const res = await deleteAccount("");
    expect(res).toEqual({ error: "accountId is required" });
    expect(prismadb.crm_Accounts.update).not.toHaveBeenCalled();
  });

  it("soft deletes account with correct data", async () => {
    (prismadb.crm_Accounts.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "a1" });
    const res = await deleteAccount("a1");
    expect(res).toEqual({ success: true });
    expect(prismadb.crm_Accounts.update).toHaveBeenCalledWith({
      where: { id: "a1" },
      data: { deletedAt: expect.any(Date), deletedBy: "u1" },
    });
  });

  it("writes audit log on success", async () => {
    (prismadb.crm_Accounts.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "a1" });
    await deleteAccount("a1");
    expect(writeAuditLog).toHaveBeenCalledWith({
      entityType: "account",
      entityId: "a1",
      action: "deleted",
      changes: null,
      userId: "u1",
    });
  });

  it("revalidates accounts path on success", async () => {
    const { revalidatePath } = await import("next/cache");
    (prismadb.crm_Accounts.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "a1" });
    await deleteAccount("a1");
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/(routes)/crm/accounts", "page");
  });

  it("returns error on prisma failure", async () => {
    (prismadb.crm_Accounts.update as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("DB error"));
    const res = await deleteAccount("a1");
    expect(res).toEqual({ error: "Failed to delete account" });
  });

  it("rejects deletion with malformed UUID", async () => {
    const res = await deleteAccount("not-a-uuid");
    expect(res.error).toBeDefined();
    expect(prismadb.crm_Accounts.update).not.toHaveBeenCalled();
  });
});
