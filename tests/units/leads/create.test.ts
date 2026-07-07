import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-server", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: vi.fn(), findFirst: vi.fn() },
    crm_Leads: { create: vi.fn() },
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

import { createLead } from "@/actions/crm/leads/create-lead";
import { inngest } from "@/inngest/client";
import { writeAuditLog } from "@/lib/audit-log";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import sendEmail from "@/lib/sendmail";

const mockUser = (id = "u1") => {
  (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id } });
};

describe("createLead", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser();
  });

  it("unauthenticated returns Unauthorized error", async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await createLead({ last_name: "Doe" });
    expect(res).toEqual({ error: "Unauthorized" });
    expect(prismadb.crm_Leads.create).not.toHaveBeenCalled();
  });

  it("creates lead with correct default fields", async () => {
    const mockLead = { id: "l1", lastName: "Doe", v: 1 };
    (prismadb.crm_Leads.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockLead);
    const res = await createLead({ last_name: "Doe" });
    expect(res).toEqual({ data: mockLead });
    expect(prismadb.crm_Leads.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        v: 1,
        createdBy: "u1",
        updatedBy: "u1",
        lastName: "Doe",
      }),
    });
  });

  it("sets assigned_to to userId when not provided", async () => {
    (prismadb.crm_Leads.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "l1",
    });
    await createLead({ last_name: "Doe" });
    const call = (prismadb.crm_Leads.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.data.assigned_to).toBe("u1");
  });

  it("maps all fields correctly", async () => {
    (prismadb.crm_Leads.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "l1",
    });
    await createLead({
      last_name: "Doe",
      first_name: "John",
      company: "Acme",
      jobTitle: "CEO",
      email: "john@acme.com",
      phone: "123456",
      description: "Test",
      lead_source_id: "ls1",
      lead_status_id: "ss1",
      lead_type_id: "lt1",
      refered_by: "ref1",
      campaign: "camp1",
      assigned_to: "u2",
      accountIDs: "a1",
    });
    const call = (prismadb.crm_Leads.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.data.firstName).toBe("John");
    expect(call.data.company).toBe("Acme");
    expect(call.data.jobTitle).toBe("CEO");
    expect(call.data.email).toBe("john@acme.com");
    expect(call.data.phone).toBe("123456");
    expect(call.data.description).toBe("Test");
    expect(call.data.lead_source_id).toBe("ls1");
    expect(call.data.lead_status_id).toBe("ss1");
    expect(call.data.lead_type_id).toBe("lt1");
    expect(call.data.refered_by).toBe("ref1");
    expect(call.data.campaign).toBe("camp1");
    expect(call.data.assigned_to).toBe("u2");
    expect(call.data.accountsIDs).toBe("a1");
  });

  it("sends email notification when assigned_to differs from userId", async () => {
    (prismadb.crm_Leads.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "l1",
    });
    (prismadb.users.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "u2",
      email: "u2@test.com",
      userLanguage: "en",
    });
    (sendEmail as ReturnType<typeof vi.fn>).mockResolvedValue({});
    await createLead({
      last_name: "Doe",
      first_name: "John",
      assigned_to: "u2",
    });
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "u2@test.com",
        subject: expect.stringContaining("New lead"),
      }),
    );
  });

  it("does NOT send email when assigned_to equals userId", async () => {
    (prismadb.crm_Leads.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "l1",
    });
    await createLead({ last_name: "Doe", assigned_to: "u1" });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("writes audit log on success", async () => {
    (prismadb.crm_Leads.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "l1",
    });
    await createLead({ last_name: "Doe" });
    expect(writeAuditLog).toHaveBeenCalledWith({
      entityType: "lead",
      entityId: "l1",
      action: "created",
      changes: null,
      userId: "u1",
    });
  });

  it("sends inngest event on success", async () => {
    (prismadb.crm_Leads.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "l1",
    });
    await createLead({ last_name: "Doe" });
    expect(inngest.send).toHaveBeenCalledWith({
      name: "crm/lead.saved",
      data: { record_id: "l1" },
    });
  });

  it("revalidates leads path on success", async () => {
    const { revalidatePath } = await import("next/cache");
    (prismadb.crm_Leads.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "l1",
    });
    await createLead({ last_name: "Doe" });
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/(routes)/crm/leads", "page");
  });

  it("returns error on prisma failure", async () => {
    (prismadb.crm_Leads.create as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("DB error"));
    const res = await createLead({ last_name: "Doe" });
    expect(res).toEqual({ error: "Failed to create lead" });
  });

  it("rejects creation with last_name of 1 character if invalid", async () => {
    const res = await createLead({
      first_name: "ShortName",
      last_name: "X",
      company: "Company",
    });
    expect(res.error).toBeDefined();
    expect(prismadb.crm_Leads.create).not.toHaveBeenCalled();
  });
});
