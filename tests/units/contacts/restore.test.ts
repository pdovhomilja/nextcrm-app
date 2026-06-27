import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-server", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: vi.fn() },
    crm_Contacts: { update: vi.fn() },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/audit-log", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

import { restoreContact } from "@/actions/crm/contacts/restore-contact";
import { writeAuditLog } from "@/lib/audit-log";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";

const mockUser = (role: "user" | "manager" | "admin" = "admin", id = "u1") => {
  (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
    user: { id, role },
  });
};

describe("restoreContact", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser("admin");
  });

  it("unauthenticated returns Unauthorized error", async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await restoreContact("c1");
    expect(res).toEqual({ error: "Unauthorized" });
    expect(prismadb.crm_Contacts.update).not.toHaveBeenCalled();
  });

  it("non-admin returns Forbidden error", async () => {
    mockUser("user");
    const res = await restoreContact("c1");
    expect(res).toEqual({ error: "Forbidden" });
    expect(prismadb.crm_Contacts.update).not.toHaveBeenCalled();
  });

  it("manager returns Forbidden error", async () => {
    mockUser("manager");
    const res = await restoreContact("c1");
    expect(res).toEqual({ error: "Forbidden" });
    expect(prismadb.crm_Contacts.update).not.toHaveBeenCalled();
  });

  it("returns error when contactId is missing", async () => {
    mockUser("admin");
    const res = await restoreContact("");
    expect(res).toEqual({ error: "contactId is required" });
  });

  it("restores contact by clearing deletedAt and deletedBy", async () => {
    (prismadb.crm_Contacts.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "c1" });
    await restoreContact("c1");
    expect(prismadb.crm_Contacts.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: {
        deletedAt: null,
        deletedBy: null,
      },
    });
  });

  it("writes audit log with action 'restored'", async () => {
    (prismadb.crm_Contacts.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "c1" });
    await restoreContact("c1");
    expect(writeAuditLog).toHaveBeenCalledWith({
      entityType: "contact",
      entityId: "c1",
      action: "restored",
      changes: null,
      userId: "u1",
    });
  });

  it("revalidates contacts and audit-log paths on success", async () => {
    const { revalidatePath } = await import("next/cache");
    (prismadb.crm_Contacts.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "c1" });
    await restoreContact("c1");
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/(routes)/crm/contacts", "page");
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/(routes)/admin/audit-log", "page");
  });

  it("returns { success: true } on success", async () => {
    (prismadb.crm_Contacts.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "c1" });
    const res = await restoreContact("c1");
    expect(res).toEqual({ success: true });
  });

  it("returns error on prisma failure", async () => {
    (prismadb.crm_Contacts.update as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("DB error"));
    const res = await restoreContact("c1");
    expect(res).toEqual({ error: "Failed to restore contact" });
  });
});
