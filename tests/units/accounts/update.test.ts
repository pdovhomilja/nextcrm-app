import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-server", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Accounts: { findUnique: vi.fn(), update: vi.fn() },
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
  diffObjects: vi.fn((before, after) => ({ before, after })),
}));

import { updateAccount } from "@/actions/crm/accounts/update-account";
import { inngest } from "@/inngest/client";
import { diffObjects, writeAuditLog } from "@/lib/audit-log";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";

const mockUser = (id = "u1") => {
  (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id } });
};

describe("updateAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser();
  });

  it("unauthenticated returns Unauthorized error", async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await updateAccount({ id: "a1", name: "Updated" });
    expect(res).toEqual({ error: "Unauthorized" });
    expect(prismadb.crm_Accounts.update).not.toHaveBeenCalled();
  });

  it("missing id returns error", async () => {
    const res = await updateAccount({ id: "" });
    expect(res).toEqual({ error: "id is required" });
    expect(prismadb.crm_Accounts.update).not.toHaveBeenCalled();
  });

  it("updates account with correct data", async () => {
    (prismadb.crm_Accounts.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "a1", name: "Old" });
    (prismadb.crm_Accounts.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "a1", name: "Updated" });
    const res = await updateAccount({ id: "a1", name: "Updated" });
    expect(res).toEqual({ data: { id: "a1", name: "Updated" } });
    expect(prismadb.crm_Accounts.update).toHaveBeenCalledWith({
      where: { id: "a1" },
      data: expect.objectContaining({
        v: 0,
        updatedBy: "u1",
        name: "Updated",
      }),
    });
  });

  it("finds before state for diff tracking", async () => {
    const before = { id: "a1", name: "Old", v: 0 };
    (prismadb.crm_Accounts.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(before);
    (prismadb.crm_Accounts.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "a1", name: "Updated" });
    await updateAccount({ id: "a1", name: "Updated" });
    expect(prismadb.crm_Accounts.findUnique).toHaveBeenCalledWith({
      where: { id: "a1", deletedAt: null },
    });
  });

  it("writes audit log with changes on success", async () => {
    const before = { id: "a1", name: "Old" };
    const after = { id: "a1", name: "Updated" };
    (prismadb.crm_Accounts.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(before);
    (prismadb.crm_Accounts.update as ReturnType<typeof vi.fn>).mockResolvedValue(after);
    (diffObjects as ReturnType<typeof vi.fn>).mockReturnValue({ name: { old: "Old", new: "Updated" } });
    await updateAccount({ id: "a1", name: "Updated" });
    expect(writeAuditLog).toHaveBeenCalledWith({
      entityType: "account",
      entityId: "a1",
      action: "updated",
      changes: { name: { old: "Old", new: "Updated" } },
      userId: "u1",
    });
  });

  it("handles null before state gracefully", async () => {
    (prismadb.crm_Accounts.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prismadb.crm_Accounts.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "a1", name: "Updated" });
    await updateAccount({ id: "a1", name: "Updated" });
    expect(writeAuditLog).toHaveBeenCalledWith({
      entityType: "account",
      entityId: "a1",
      action: "updated",
      changes: null,
      userId: "u1",
    });
  });

  it("sends inngest event on success", async () => {
    (prismadb.crm_Accounts.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "a1", name: "Old" });
    (prismadb.crm_Accounts.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "a1", name: "Updated" });
    await updateAccount({ id: "a1", name: "Updated" });
    expect(inngest.send).toHaveBeenCalledWith({
      name: "crm/account.saved",
      data: { record_id: "a1" },
    });
  });

  it("revalidates accounts path on success", async () => {
    const { revalidatePath } = await import("next/cache");
    (prismadb.crm_Accounts.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "a1", name: "Old" });
    (prismadb.crm_Accounts.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "a1", name: "Updated" });
    await updateAccount({ id: "a1", name: "Updated" });
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/(routes)/crm/accounts", "page");
  });

  it("returns error on prisma failure", async () => {
    (prismadb.crm_Accounts.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "a1", name: "Old" });
    (prismadb.crm_Accounts.update as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("DB error"));
    const res = await updateAccount({ id: "a1", name: "Updated" });
    expect(res).toEqual({ error: "Failed to update account" });
  });
});
