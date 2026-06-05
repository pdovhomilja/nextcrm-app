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

import { restoreAccount } from "@/actions/crm/accounts/restore-account";
import { writeAuditLog } from "@/lib/audit-log";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
    user: { id, role },
  });
};

describe("restoreAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("unauthenticated returns Unauthorized error", async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await restoreAccount("a1");
    expect(res).toEqual({ error: "Unauthorized" });
    expect(prismadb.crm_Accounts.update).not.toHaveBeenCalled();
  });

  it("non-admin returns Forbidden error", async () => {
    mockUser("user");
    const res = await restoreAccount("a1");
    expect(res).toEqual({ error: "Forbidden" });
    expect(prismadb.crm_Accounts.update).not.toHaveBeenCalled();
  });

  it("manager also returns Forbidden error", async () => {
    mockUser("manager");
    const res = await restoreAccount("a1");
    expect(res).toEqual({ error: "Forbidden" });
  });

  it("missing accountId returns error", async () => {
    mockUser("admin");
    const res = await restoreAccount("");
    expect(res).toEqual({ error: "accountId is required" });
    expect(prismadb.crm_Accounts.update).not.toHaveBeenCalled();
  });

  it("admin restores account correctly", async () => {
    mockUser("admin");
    (prismadb.crm_Accounts.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "a1" });
    const res = await restoreAccount("a1");
    expect(res).toEqual({ success: true });
    expect(prismadb.crm_Accounts.update).toHaveBeenCalledWith({
      where: { id: "a1" },
      data: { deletedAt: null, deletedBy: null },
    });
  });

  it("writes audit log on success", async () => {
    mockUser("admin");
    (prismadb.crm_Accounts.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "a1" });
    await restoreAccount("a1");
    expect(writeAuditLog).toHaveBeenCalledWith({
      entityType: "account",
      entityId: "a1",
      action: "restored",
      changes: null,
      userId: "u1",
    });
  });

  it("revalidates accounts and audit-log paths", async () => {
    const { revalidatePath } = await import("next/cache");
    mockUser("admin");
    (prismadb.crm_Accounts.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "a1" });
    await restoreAccount("a1");
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/(routes)/crm/accounts", "page");
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/(routes)/admin/audit-log", "page");
  });

  it("returns error on prisma failure", async () => {
    mockUser("admin");
    (prismadb.crm_Accounts.update as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("DB error"));
    const res = await restoreAccount("a1");
    expect(res).toEqual({ error: "Failed to restore account" });
  });
});
