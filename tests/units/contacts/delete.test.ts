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

import { deleteContact } from "@/actions/crm/contacts/delete-contact";
import { writeAuditLog } from "@/lib/audit-log";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";

const mockUser = (id = "u1") => {
  (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id } });
};

describe("deleteContact", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser();
  });

  it("unauthenticated returns Unauthorized error", async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await deleteContact("c1");
    expect(res).toEqual({ error: "Unauthorized" });
    expect(prismadb.crm_Contacts.update).not.toHaveBeenCalled();
  });

  it("returns error when contactId is missing", async () => {
    mockUser();
    const res = await deleteContact("");
    expect(res).toEqual({ error: "contactId is required" });
  });

  it("soft deletes contact by setting deletedAt and deletedBy", async () => {
    (prismadb.crm_Contacts.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "c1" });
    await deleteContact("c1");
    expect(prismadb.crm_Contacts.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: expect.objectContaining({
        deletedAt: expect.any(Date),
        deletedBy: "u1",
      }),
    });
  });

  it("writes audit log with action 'deleted'", async () => {
    (prismadb.crm_Contacts.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "c1" });
    await deleteContact("c1");
    expect(writeAuditLog).toHaveBeenCalledWith({
      entityType: "contact",
      entityId: "c1",
      action: "deleted",
      changes: null,
      userId: "u1",
    });
  });

  it("revalidates contacts path on success", async () => {
    const { revalidatePath } = await import("next/cache");
    (prismadb.crm_Contacts.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "c1" });
    await deleteContact("c1");
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/(routes)/crm/contacts", "page");
  });

  it("returns { success: true } on success", async () => {
    (prismadb.crm_Contacts.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "c1" });
    const res = await deleteContact("c1");
    expect(res).toEqual({ success: true });
  });

  it("returns error on prisma failure", async () => {
    (prismadb.crm_Contacts.update as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("DB error"));
    const res = await deleteContact("c1");
    expect(res).toEqual({ error: "Failed to delete contact" });
  });
});
