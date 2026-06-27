import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-server", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: vi.fn(), findFirst: vi.fn() },
    crm_Contacts: { create: vi.fn() },
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

import { createContact } from "@/actions/crm/contacts/create-contact";
import { inngest } from "@/inngest/client";
import { writeAuditLog } from "@/lib/audit-log";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import sendEmail from "@/lib/sendmail";

const mockUser = (id = "u1") => {
  (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id } });
};

describe("createContact", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser();
  });

  it("unauthenticated returns Unauthorized error", async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await createContact({ last_name: "Doe" });
    expect(res).toEqual({ error: "Unauthorized" });
    expect(prismadb.crm_Contacts.create).not.toHaveBeenCalled();
  });

  it("creates contact with correct default fields", async () => {
    const mockContact = { id: "c1", lastName: "Doe", v: 0 };
    (prismadb.crm_Contacts.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockContact);
    const res = await createContact({ last_name: "Doe" });
    expect(res).toEqual({ data: mockContact });
    expect(prismadb.crm_Contacts.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        v: 0,
        createdBy: "u1",
        updatedBy: "u1",
        last_name: "Doe",
      }),
    });
  });

  it("maps birthday_day/month/year to birthday field", async () => {
    (prismadb.crm_Contacts.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "c1" });
    await createContact({
      last_name: "Doe",
      birthday_day: "15",
      birthday_month: "06",
      birthday_year: "1990",
    });
    const call = (prismadb.crm_Contacts.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.data.birthday).toBe("15/06/1990");
  });

  it("sets birthday to null when any birthday field is missing", async () => {
    (prismadb.crm_Contacts.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "c1" });
    await createContact({
      last_name: "Doe",
      birthday_day: "15",
      birthday_month: "06",
    });
    const call = (prismadb.crm_Contacts.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.data.birthday).toBeNull();
  });

  it("sends email notification when assigned_to differs from userId", async () => {
    (prismadb.crm_Contacts.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "c1" });
    (prismadb.users.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "u2",
      email: "u2@test.com",
      userLanguage: "en",
    });
    (sendEmail as ReturnType<typeof vi.fn>).mockResolvedValue({});
    await createContact({
      last_name: "Doe",
      first_name: "John",
      assigned_to: "u2",
    });
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "u2@test.com",
        subject: expect.stringContaining("New contact"),
      }),
    );
  });

  it("does NOT send email when assigned_to equals userId", async () => {
    (prismadb.crm_Contacts.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "c1" });
    await createContact({ last_name: "Doe", assigned_to: "u1" });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(prismadb.users.findUnique).not.toHaveBeenCalled();
  });

  it("does NOT send email when assigned_to is not provided", async () => {
    (prismadb.crm_Contacts.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "c1" });
    await createContact({ last_name: "Doe" });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("writes audit log on success", async () => {
    (prismadb.crm_Contacts.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "c1" });
    await createContact({ last_name: "Doe" });
    expect(writeAuditLog).toHaveBeenCalledWith({
      entityType: "contact",
      entityId: "c1",
      action: "created",
      changes: null,
      userId: "u1",
    });
  });

  it("sends inngest event on success", async () => {
    (prismadb.crm_Contacts.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "c1" });
    await createContact({ last_name: "Doe" });
    expect(inngest.send).toHaveBeenCalledWith({
      name: "crm/contact.saved",
      data: { record_id: "c1" },
    });
  });

  it("revalidates contacts path on success", async () => {
    const { revalidatePath } = await import("next/cache");
    (prismadb.crm_Contacts.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "c1" });
    await createContact({ last_name: "Doe" });
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/crm/contacts", "page");
  });

  it("returns error on prisma failure", async () => {
    (prismadb.crm_Contacts.create as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("DB error"));
    const res = await createContact({ last_name: "Doe" });
    expect(res).toEqual({ error: "Failed to create contact" });
  });
});
